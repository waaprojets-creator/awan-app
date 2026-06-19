#!/usr/bin/env python3
"""AWAN — Treemap visual des fichiers src/."""

import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch

SRC = "/home/user/awan-app/src"
OUT = "/home/user/awan-app/awan-tree-map.png"

DOMAIN_META = {
    "screens":    {"color": "#E8A838", "label": "Screens"},
    "services":   {"color": "#EE6B6B", "label": "Services"},
    "modules":    {"color": "#7AC74F", "label": "Modules"},
    "hooks":      {"color": "#C97BDB", "label": "Hooks"},
    "data":       {"color": "#4ECDC4", "label": "Data / Schemas"},
    "components": {"color": "#5B8DEE", "label": "Components"},
    "utils":      {"color": "#F7B731", "label": "Utils"},
    "constants":  {"color": "#A0A0A0", "label": "Constants"},
    "context":    {"color": "#FF9F43", "label": "Context"},
    "store":      {"color": "#FD9644", "label": "Store"},
    "theme":      {"color": "#B8B8FF", "label": "Theme"},
    "types":      {"color": "#CFCFCF", "label": "Types"},
    "i18n":       {"color": "#74B9FF", "label": "i18n"},
    "__mocks__":  {"color": "#DFE6E9", "label": "Mocks"},
    "root":       {"color": "#888888", "label": "Root"},
}

def domain_of(path):
    parts = path.split("/")
    return "root" if len(parts) == 1 else parts[0]

def short_label(filepath, domain):
    if domain == "root":
        return filepath
    prefix = domain + "/"
    label = filepath[len(prefix):] if filepath.startswith(prefix) else filepath
    if len(label) > 36:
        label = "…" + label[-34:]
    return label

def collect():
    files = []
    for root, _, fnames in os.walk(SRC):
        for f in fnames:
            if f.endswith((".ts", ".tsx")):
                rel = os.path.relpath(os.path.join(root, f), SRC)
                files.append(rel.replace("\\", "/"))
    return sorted(files)

def group(files):
    groups = {}
    for f in files:
        d = domain_of(f)
        groups.setdefault(d, []).append(f)
    order = sorted(groups.keys(), key=lambda k: -len(groups[k]))
    return groups, order

def draw(files):
    groups, order = group(files)

    # Layout: 3 columns of domains
    NCOLS = 3
    col_domains = [[], [], []]
    col_heights = [0, 0, 0]
    for d in order:
        n = len(groups[d])
        # place in shortest column
        c = col_heights.index(min(col_heights))
        col_domains[c].append(d)
        col_heights[c] += n + 2  # +2 for header spacing

    max_h = max(col_heights)

    ROW_H = 0.26
    FIG_W = 36
    FIG_H = max_h * ROW_H + 4
    COLW = FIG_W / NCOLS

    fig, ax = plt.subplots(figsize=(FIG_W, FIG_H))
    fig.patch.set_facecolor("#0F0F1A")
    ax.set_facecolor("#0F0F1A")
    ax.set_xlim(0, FIG_W)
    ax.set_ylim(-FIG_H + 2, 2.5)
    ax.axis("off")

    # ── Title ────────────────────────────────────────────────────────────────
    ax.text(FIG_W / 2, 2.0, "AWAN — Carte des fichiers src/",
            ha="center", va="center", fontsize=24, fontweight="bold",
            color="white", fontfamily="monospace")
    ax.text(FIG_W / 2, 1.3, f"{len(files)} fichiers  ·  {len(groups)} domaines  ·  branche main",
            ha="center", va="center", fontsize=12, color="#8888AA",
            fontfamily="monospace")

    HEADER_H = 0.55
    GAP_BETWEEN = 0.6

    for col_i, domains in enumerate(col_domains):
        x0 = col_i * COLW + 0.3
        y = -0.2

        for domain in domains:
            meta = DOMAIN_META.get(domain, {"color": "#888", "label": domain})
            color = meta["color"]
            file_list = groups[domain]
            n = len(file_list)

            # Header box
            hbox = FancyBboxPatch(
                (x0, y - HEADER_H), COLW - 0.6, HEADER_H,
                boxstyle="round,pad=0.05",
                facecolor=color, edgecolor="none", alpha=0.95,
                zorder=3
            )
            ax.add_patch(hbox)
            ax.text(x0 + (COLW - 0.6) / 2, y - HEADER_H / 2,
                    f"{meta['label']}  ({n})",
                    ha="center", va="center",
                    fontsize=10, fontweight="bold",
                    color="white", fontfamily="monospace", zorder=4)

            y -= HEADER_H

            # Thin vertical connector
            line_x = x0 + 0.4
            ax.plot([line_x, line_x],
                    [y, y - n * ROW_H],
                    color=color, alpha=0.20, linewidth=1.5, zorder=1)

            for i, filepath in enumerate(file_list):
                label = short_label(filepath, domain)
                fy = y - i * ROW_H - ROW_H / 2

                # Alternating row bg
                if i % 2 == 0:
                    rbg = FancyBboxPatch(
                        (x0 + 0.02, fy - ROW_H / 2 + 0.02),
                        COLW - 0.64, ROW_H - 0.04,
                        boxstyle="round,pad=0.01",
                        facecolor=color, edgecolor="none", alpha=0.08, zorder=2
                    )
                    ax.add_patch(rbg)

                # Dot
                dot_color = "#5B8DEE" if label.endswith(".tsx") else "#6C6C8A"
                ax.plot(x0 + 0.55, fy, "o", color=dot_color,
                        markersize=4.5, zorder=3, alpha=0.9)

                # Horizontal tick from connector
                ax.plot([line_x, x0 + 0.5], [fy, fy],
                        color=color, alpha=0.15, linewidth=0.8, zorder=1)

                # Label
                ax.text(x0 + 0.72, fy, label,
                        ha="left", va="center",
                        fontsize=6.5, color="#D8D8EE",
                        fontfamily="monospace", zorder=3)

            y -= n * ROW_H + GAP_BETWEEN

    # ── Legend ───────────────────────────────────────────────────────────────
    lx = 0.8
    ly = -FIG_H + 2.3
    ax.plot(lx, ly, "o", color="#5B8DEE", markersize=7)
    ax.text(lx + 0.4, ly, ".tsx  composant React",
            va="center", fontsize=9, color="#8888AA", fontfamily="monospace")
    ax.plot(lx, ly - 0.4, "o", color="#6C6C8A", markersize=7)
    ax.text(lx + 0.4, ly - 0.4, ".ts   logique / service / schéma",
            va="center", fontsize=9, color="#8888AA", fontfamily="monospace")

    plt.tight_layout(pad=0.2)
    plt.savefig(OUT, dpi=150, bbox_inches="tight",
                facecolor=fig.get_facecolor())
    plt.close()
    print(f"✅  Saved → {OUT}")

if __name__ == "__main__":
    files = collect()
    print(f"📂  {len(files)} fichiers trouvés")
    draw(files)
