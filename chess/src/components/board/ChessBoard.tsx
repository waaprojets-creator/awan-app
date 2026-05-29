import { useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Arrow as RCBArrow } from 'react-chessboard/dist/chessboard/types';
import type { Arrow } from '@/types/chess';

interface ChessBoardProps {
  fen: string;
  onMove?: (from: string, to: string, promotion?: string) => boolean;
  boardFlipped?: boolean;
  arrows?: Arrow[];
  highlightSquares?: string[];
  interactive?: boolean;
  lastMoveSquares?: [string, string] | null;
  kingCheckSquare?: string | null;
  width?: number;
}

export function ChessBoard({
  fen,
  onMove,
  boardFlipped = false,
  arrows = [],
  interactive = true,
  lastMoveSquares = null,
  kingCheckSquare = null,
  width,
}: ChessBoardProps) {
  const handlePieceDrop = useCallback(
    (sourceSquare: string, targetSquare: string, piece: string): boolean => {
      if (!onMove) return false;
      const isPromotion =
        piece.slice(1) === 'P' &&
        ((piece[0] === 'w' && targetSquare[1] === '8') ||
          (piece[0] === 'b' && targetSquare[1] === '1'));
      return onMove(sourceSquare, targetSquare, isPromotion ? 'q' : undefined);
    },
    [onMove]
  );

  const customSquareStyles: Record<string, React.CSSProperties> = {};

  if (lastMoveSquares) {
    customSquareStyles[lastMoveSquares[0]] = {
      background: 'rgba(204, 210, 56, 0.4)',
    };
    customSquareStyles[lastMoveSquares[1]] = {
      background: 'rgba(204, 210, 56, 0.4)',
    };
  }

  if (kingCheckSquare) {
    customSquareStyles[kingCheckSquare] = {
      background: 'radial-gradient(circle, rgba(220, 50, 50, 0.9) 0%, rgba(220, 50, 50, 0.0) 75%)',
    };
  }

  const rcbArrows: RCBArrow[] = arrows.map((a) => [a.from, a.to, a.color ?? 'rgba(0,180,0,0.7)'] as RCBArrow);

  return (
    <div className="board-container">
      <Chessboard
        position={fen}
        onPieceDrop={interactive ? handlePieceDrop : undefined}
        boardOrientation={boardFlipped ? 'black' : 'white'}
        customBoardStyle={{
          borderRadius: '4px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}
        customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
        customDarkSquareStyle={{ backgroundColor: '#b58863' }}
        customSquareStyles={customSquareStyles}
        customArrows={rcbArrows}
        boardWidth={width}
        animationDuration={100}
        promotionDialogVariant="modal"
        areArrowsAllowed={false}
        isDraggablePiece={({ piece }) => {
          if (!interactive) return false;
          return true;
        }}
      />
    </div>
  );
}
