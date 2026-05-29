/* Classic Web Worker — loads stockfish-nnue-16-single via importScripts */
importScripts('/stockfish/stockfish-nnue-16-single.js');

let engine = null;
let lastScore = null;
let initialized = false;

function postReady() {
  self.postMessage({ type: 'ready' });
}

Stockfish().then(function (sf) {
  engine = sf;

  sf.addMessageListener(function (line) {
    if (line === 'readyok' || line === 'uciok') {
      if (!initialized) {
        initialized = true;
        postReady();
      }
      return;
    }

    if (line.startsWith('bestmove')) {
      var parts = line.split(' ');
      var move = parts[1] || '';
      var ponder = parts[3] || null;
      self.postMessage({ type: 'bestmove', move: move, ponder: ponder, score: lastScore });
      lastScore = null;
      return;
    }

    if (line.startsWith('info') && line.includes(' score ') && !line.includes(' currmove ')) {
      var depthM = line.match(/depth (\d+)/);
      var cpM = line.match(/score cp (-?\d+)/);
      var mateM = line.match(/score mate (-?\d+)/);
      var pvM = line.match(/ pv (.+?)(?= bm| string|$)/);

      if (!depthM) return;
      var depth = parseInt(depthM[1]);
      var pv = pvM ? pvM[1].trim().split(' ') : [];

      if (cpM) {
        lastScore = { type: 'cp', value: parseInt(cpM[1]) };
      } else if (mateM) {
        lastScore = { type: 'mate', value: parseInt(mateM[1]) };
      }

      if (lastScore) {
        self.postMessage({ type: 'info', depth: depth, score: lastScore, pv: pv });
      }
    }
  });

  sf.postMessage('uci');
  sf.postMessage('isready');
}).catch(function (err) {
  self.postMessage({ type: 'error', message: String(err) });
});

self.onmessage = function (e) {
  if (!engine) return;
  var data = e.data;

  switch (data.type) {
    case 'setElo':
      engine.postMessage('setoption name UCI_LimitStrength value true');
      engine.postMessage('setoption name UCI_Elo value ' + data.uciElo);
      engine.postMessage('setoption name Skill Level value ' + data.skillLevel);
      engine.postMessage('isready');
      break;

    case 'setPosition':
      var moveStr = data.moves && data.moves.length ? ' moves ' + data.moves.join(' ') : '';
      engine.postMessage('position fen ' + data.fen + moveStr);
      break;

    case 'go':
      var cmd = 'go';
      if (data.movetime) cmd += ' movetime ' + data.movetime;
      if (data.depth) cmd += ' depth ' + data.depth;
      if (!data.movetime && !data.depth) cmd += ' movetime 3000';
      engine.postMessage(cmd);
      break;

    case 'stop':
      engine.postMessage('stop');
      break;

    case 'newgame':
      engine.postMessage('ucinewgame');
      engine.postMessage('isready');
      break;
  }
};
