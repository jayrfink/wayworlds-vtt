import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('VttCanvas & RpgVttView Group Selection & Movement', () => {
  const canvasPath = path.resolve(__dirname, '../src/components/VttCanvas.vue');
  const canvasContent = fs.readFileSync(canvasPath, 'utf8');

  const vttViewPath = path.resolve(__dirname, '../src/views/RpgVttView.vue');
  const vttViewContent = fs.readFileSync(vttViewPath, 'utf8');

  describe('VttCanvas Component Implementation', () => {
    it('defines selectedTokenIds prop and tokens-selected / tokens-moved emits', () => {
      expect(canvasContent).toContain('selectedTokenIds: {');
      expect(canvasContent).toContain("emit = defineEmits([");
      expect(canvasContent).toContain("'tokens-selected'");
      expect(canvasContent).toContain("'tokens-moved'");
    });

    it('manages marquee selection state and renders marquee drag rectangle', () => {
      expect(canvasContent).toContain('const isMarqueeSelecting = ref(false);');
      expect(canvasContent).toContain('const marqueeStart = ref(');
      expect(canvasContent).toContain('const marqueeCurrent = ref(');
      expect(canvasContent).toContain('function drawMarqueeSelection(ctx)');
      expect(canvasContent).toContain('rgba(56, 189, 248, 0.15)');
      expect(canvasContent).toContain('#38bdf8');
      expect(canvasContent).toContain('drawMarqueeSelection(ctx);');
    });

    it('starts marquee selection on empty canvas mousedown in select mode', () => {
      const mouseDownSection = canvasContent.slice(
        canvasContent.indexOf('function onMouseDown'),
        canvasContent.indexOf('function onDoubleClick')
      );
      expect(mouseDownSection).toContain('isMarqueeSelecting.value = true;');
      expect(mouseDownSection).toContain('marqueeStart.value = { x: worldPos.x, y: worldPos.y };');
    });

    it('resolves tokens inside marquee bounding box on mouseup and emits tokens-selected', () => {
      const mouseUpSection = canvasContent.slice(
        canvasContent.indexOf('function onMouseUp'),
        canvasContent.indexOf('function onWheel')
      );
      expect(mouseUpSection).toContain('if (isMarqueeSelecting.value)');
      expect(mouseUpSection).toContain("emit('tokens-selected', selectedObjects);");
      expect(mouseUpSection).toContain("emit('token-selected', selectedObjects[0] || null);");
    });

    it('supports Shift/Ctrl click to toggle individual tokens in/out of selection group', () => {
      const mouseDownSection = canvasContent.slice(
        canvasContent.indexOf('function onMouseDown'),
        canvasContent.indexOf('function onDoubleClick')
      );
      expect(mouseDownSection).toContain('const isShift = Boolean(e.shiftKey || e.ctrlKey || e.metaKey);');
      expect(mouseDownSection).toContain('if (isShift)');
      expect(mouseDownSection).toContain('localSelectedTokenIds.value.filter((id) => id !== hitToken.id)');
      expect(mouseDownSection).toContain('[...localSelectedTokenIds.value, hitToken.id]');
    });

    it('coordinates group dragging and preserves relative token formation', () => {
      expect(canvasContent).toContain('function getGroupDeltas(deltaX, deltaY)');
      expect(canvasContent).toContain('const dragTokensList = ref([]);');
      const mouseUpSection = canvasContent.slice(
        canvasContent.indexOf('function onMouseUp'),
        canvasContent.indexOf('function onWheel')
      );
      expect(mouseUpSection).toContain("emit('tokens-moved', movedTokens);");
    });

    it('renders ghost tokens for all tokens in the group while dragging', () => {
      const drawCanvasSection = canvasContent.slice(
        canvasContent.indexOf('function drawCanvas()'),
        canvasContent.indexOf('function fogEraserSizePx()')
      );
      expect(drawCanvasSection).toContain('if (dragTokensList.value.length > 0');
      expect(drawCanvasSection).toContain('getGroupDeltas(rawDx, rawDy)');
      expect(drawCanvasSection).toContain('drawGhostToken(ctx, dt.token, targetCell);');
    });

    it('clears selection when Escape key is pressed', () => {
      const keyDownSection = canvasContent.slice(
        canvasContent.indexOf('function onKeyDown'),
        canvasContent.indexOf('function onKeyUp')
      );
      expect(keyDownSection).toContain("e.key === 'Escape'");
      expect(keyDownSection).toContain('localSelectedTokenIds.value = [];');
      expect(keyDownSection).toContain("emit('tokens-selected', []);");
    });
  });

  describe('RpgVttView Integration', () => {
    it('passes selected-token-ids and listens for tokens-moved and tokens-selected', () => {
      expect(vttViewContent).toContain(':selected-token-ids="selectedTokenIds"');
      expect(vttViewContent).toContain('@tokens-moved="onTokensMoved"');
      expect(vttViewContent).toContain('@tokens-selected="onTokensSelected"');
    });

    it('tracks selectedTokenIds and updates on group selection', () => {
      expect(vttViewContent).toContain('const selectedTokenIds = ref(');
      expect(vttViewContent).toContain('function onTokensSelected(tokenList)');
      expect(vttViewContent).toContain('selectedTokenIds.value = tokenList.map(');
    });

    it('optimistically updates and persists moved tokens via onTokensMoved', () => {
      expect(vttViewContent).toContain('async function onTokensMoved(movedList)');
      expect(vttViewContent).toContain('Promise.allSettled(updatePromises)');
    });

    it('displays multi-tokens-badge in token inspector when multiple tokens are selected', () => {
      expect(vttViewContent).toContain('selectedTokenIds.length > 1');
      expect(vttViewContent).toContain('multi-tokens-badge');
      expect(vttViewContent).toContain('Group Selected ({{ selectedTokenIds.length }} tokens)');
    });

    it('supports Shift-click in the sidebar token list to multi-select', () => {
      expect(vttViewContent).toContain('onTokenListClick($event, t)');
      expect(vttViewContent).toContain('function onTokenListClick(e, token)');
    });
  });
});
