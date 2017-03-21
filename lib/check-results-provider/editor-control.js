"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const atom_1 = require("atom");
const utils_1 = require("../utils");
class CREditorControl {
    constructor(editor, pluginManager) {
        this.editor = editor;
        this.gutter = this.editor.gutterWithName('ide-haskell-check-results');
        if (!this.gutter) {
            this.gutter = this.editor.addGutter({
                name: 'ide-haskell-check-results',
                priority: 10
            });
        }
        this.gutterElement = atom.views.getView(this.gutter);
        const results = pluginManager.resultsDB;
        this.tooltipRegistry = pluginManager.tooltipRegistry;
        this.disposables = new atom_1.CompositeDisposable();
        this.markers = editor.addMarkerLayer({
            maintainHistory: true,
            persistent: false
        });
        this.markerProps = new WeakMap();
        this.disposables.add(results.onDidUpdate(this.updateResults.bind(this)));
        this.updateResults(results);
        this.registerGutterEvents();
    }
    destroy() {
        this.markers.destroy();
        this.disposables.dispose();
        try {
            this.gutter.destroy();
        }
        catch (e) {
            console.warn(e);
        }
    }
    getMessageAt(pos, type) {
        const markers = this.find(pos, type);
        const result = [];
        for (const marker of markers) {
            const res = this.markerProps.get(marker);
            if (!res) {
                continue;
            }
            result.push(res.message);
        }
        return result;
    }
    registerGutterEvents() {
        this.disposables.add(utils_1.listen(this.gutterElement, 'mouseover', '.decoration', (e) => {
            const bufferPt = utils_1.bufferPositionFromMouseEvent(this.editor, e);
            if (bufferPt) {
                const msg = this.getMessageAt(bufferPt, 'gutter');
                if (msg.length > 0) {
                    this.tooltipRegistry.showTooltip(this.editor, 'mouse', {
                        pluginName: 'builtin:check-results',
                        tooltip: {
                            text: msg,
                            range: new atom_1.Range(bufferPt, bufferPt)
                        }
                    });
                }
            }
        }));
        this.disposables.add(utils_1.listen(this.gutterElement, 'mouseout', '.decoration', (e) => this.tooltipRegistry.hideTooltip(this.editor, 'mouse', 'builtin:check-results')));
    }
    updateResults(res) {
        this.markers.clear();
        const path = this.editor.getPath();
        for (const r of res.filter(({ uri }) => uri === path)) {
            this.markerFromCheckResult(r);
        }
    }
    markerFromCheckResult(resItem) {
        const { position } = resItem;
        if (!position) {
            return;
        }
        const range = new atom_1.Range(position, atom_1.Point.fromObject([position.row, position.column + 1]));
        const marker = this.markers.markBufferRange(range, { invalidate: 'touch' });
        this.markerProps.set(marker, resItem);
        const disp = new atom_1.CompositeDisposable();
        disp.add(marker.onDidDestroy(() => {
            this.markerProps.delete(marker);
            disp.dispose();
        }), marker.onDidChange(({ isValid }) => {
            resItem.setValid(isValid);
        }));
        this.decorateMarker(marker, resItem);
    }
    decorateMarker(m, r) {
        if (!this.gutter) {
            return;
        }
        const cls = { class: `ide-haskell-${r.severity}` };
        this.gutter.decorateMarker(m, Object.assign({ type: 'line-number' }, cls));
        this.editor.decorateMarker(m, Object.assign({ type: 'highlight' }, cls));
        this.editor.decorateMarker(m, Object.assign({ type: 'line' }, cls));
    }
    find(pos, type) {
        switch (type) {
            case 'gutter':
            case 'selection':
                return this.markers.findMarkers({ startBufferRow: pos.row });
            case 'keyboard':
                return this.markers.findMarkers({ startBufferPosition: pos });
            case 'mouse':
            case 'context':
                return this.markers.findMarkers({ containsBufferPosition: pos });
            default: throw new TypeError('Switch assertion failed');
        }
    }
}
exports.CREditorControl = CREditorControl;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLWNvbnRyb2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY2hlY2stcmVzdWx0cy1wcm92aWRlci9lZGl0b3ItY29udHJvbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLCtCQUdhO0FBT2Isb0NBQTZEO0FBRzdEO0lBT0UsWUFBcUIsTUFBa0IsRUFBRSxhQUE0QjtRQUFoRCxXQUFNLEdBQU4sTUFBTSxDQUFZO1FBQ3JDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtRQUNyRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ2pCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUM7Z0JBQ2xDLElBQUksRUFBRSwyQkFBMkI7Z0JBQ2pDLFFBQVEsRUFBRSxFQUFFO2FBQ2IsQ0FBQyxDQUFBO1FBQ0osQ0FBQztRQUNELElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRXBELE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxTQUFTLENBQUE7UUFDdkMsSUFBSSxDQUFDLGVBQWUsR0FBRyxhQUFhLENBQUMsZUFBZSxDQUFBO1FBRXBELElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSwwQkFBbUIsRUFBRSxDQUFBO1FBQzVDLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQztZQUNuQyxlQUFlLEVBQUUsSUFBSTtZQUNyQixVQUFVLEVBQUUsS0FBSztTQUNsQixDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksT0FBTyxFQUFFLENBQUE7UUFDaEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFdBQVcs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Q0FBQyxDQUFBO1FBQ3pELENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUFuSUQsMENBbUlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgUmFuZ2UsIFRleHRFZGl0b3IsIFBvaW50LCBDb21wb3NpdGVEaXNwb3NhYmxlLCBHdXR0ZXIsIERpc3BsYXlNYXJrZXIsXG4gIERpc3BsYXlNYXJrZXJMYXllclxufSBmcm9tICdhdG9tJ1xuXG5pbXBvcnQge1Jlc3VsdEl0ZW19IGZyb20gJy4uL3Jlc3VsdHMtZGInXG5pbXBvcnQge01lc3NhZ2VPYmplY3R9IGZyb20gJy4uL3V0aWxzJ1xuaW1wb3J0IHtSZXN1bHRzREJ9IGZyb20gJy4uL3Jlc3VsdHMtZGInXG5pbXBvcnQge1RFdmVudFJhbmdlVHlwZX0gZnJvbSAnLi4vZWRpdG9yLWNvbnRyb2wvdG9vbHRpcC1tYW5hZ2VyJ1xuaW1wb3J0IHtQbHVnaW5NYW5hZ2VyLCBJRWRpdG9yQ29udHJvbGxlcn0gZnJvbSAnLi4vcGx1Z2luLW1hbmFnZXInXG5pbXBvcnQge2xpc3RlbiwgYnVmZmVyUG9zaXRpb25Gcm9tTW91c2VFdmVudH0gZnJvbSAnLi4vdXRpbHMnXG5pbXBvcnQge1Rvb2x0aXBSZWdpc3RyeX0gZnJvbSAnLi4vdG9vbHRpcC1yZWdpc3RyeSdcblxuZXhwb3J0IGNsYXNzIENSRWRpdG9yQ29udHJvbCBpbXBsZW1lbnRzIElFZGl0b3JDb250cm9sbGVyIHtcbiAgcHJpdmF0ZSBndXR0ZXI6IEd1dHRlclxuICBwcml2YXRlIGd1dHRlckVsZW1lbnQ6IEhUTUxFbGVtZW50XG4gIHByaXZhdGUgbWFya2VyczogRGlzcGxheU1hcmtlckxheWVyXG4gIHByaXZhdGUgZGlzcG9zYWJsZXM6IENvbXBvc2l0ZURpc3Bvc2FibGVcbiAgcHJpdmF0ZSBtYXJrZXJQcm9wczogV2Vha01hcDxEaXNwbGF5TWFya2VyLCBSZXN1bHRJdGVtPlxuICBwcml2YXRlIHRvb2x0aXBSZWdpc3RyeTogVG9vbHRpcFJlZ2lzdHJ5XG4gIGNvbnN0cnVjdG9yIChwcml2YXRlIGVkaXRvcjogVGV4dEVkaXRvciwgcGx1Z2luTWFuYWdlcjogUGx1Z2luTWFuYWdlcikge1xuICAgIHRoaXMuZ3V0dGVyID0gdGhpcy5lZGl0b3IuZ3V0dGVyV2l0aE5hbWUoJ2lkZS1oYXNrZWxsLWNoZWNrLXJlc3VsdHMnKVxuICAgIGlmICghdGhpcy5ndXR0ZXIpIHtcbiAgICAgIHRoaXMuZ3V0dGVyID0gdGhpcy5lZGl0b3IuYWRkR3V0dGVyKHtcbiAgICAgICAgbmFtZTogJ2lkZS1oYXNrZWxsLWNoZWNrLXJlc3VsdHMnLFxuICAgICAgICBwcmlvcml0eTogMTBcbiAgICAgIH0pXG4gICAgfVxuICAgIHRoaXMuZ3V0dGVyRWxlbWVudCA9IGF0b20udmlld3MuZ2V0Vmlldyh0aGlzLmd1dHRlcilcblxuICAgIGNvbnN0IHJlc3VsdHMgPSBwbHVnaW5NYW5hZ2VyLnJlc3VsdHNEQlxuICAgIHRoaXMudG9vbHRpcFJlZ2lzdHJ5ID0gcGx1Z2luTWFuYWdlci50b29sdGlwUmVnaXN0cnlcblxuICAgIHRoaXMuZGlzcG9zYWJsZXMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZSgpXG4gICAgdGhpcy5tYXJrZXJzID0gZWRpdG9yLmFkZE1hcmtlckxheWVyKHtcbiAgICAgIG1haW50YWluSGlzdG9yeTogdHJ1ZSxcbiAgICAgIHBlcnNpc3RlbnQ6IGZhbHNlXG4gICAgfSlcbiAgICB0aGlzLm1hcmtlclByb3BzID0gbmV3IFdlYWtNYXAoKVxuICAgIHRoaXMuZGlzcG9zYWJsZXMuYWRkKHJlc3VsdHMub25EaWRVcGRhdGUodGhpcy51cGRhdGVSZXN1bHRzLmJpbmQodGhpcykpKVxuICAgIHRoaXMudXBkYXRlUmVzdWx0cyhyZXN1bHRzKVxuICAgIHRoaXMucmVnaXN0ZXJHdXR0ZXJFdmVudHMoKVxuICB9XG5cbiAgcHVibGljIGRlc3Ryb3kgKCkge1xuICAgIHRoaXMubWFya2Vycy5kZXN0cm95KClcbiAgICB0aGlzLmRpc3Bvc2FibGVzLmRpc3Bvc2UoKVxuICAgIHRyeSB7XG4gICAgICB0aGlzLmd1dHRlci5kZXN0cm95KClcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBjb25zb2xlLndhcm4oZSlcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgZ2V0TWVzc2FnZUF0IChwb3M6IFBvaW50LCB0eXBlOiBURXZlbnRSYW5nZVR5cGUgfCAnZ3V0dGVyJykge1xuICAgIGNvbnN0IG1hcmtlcnMgPSB0aGlzLmZpbmQocG9zLCB0eXBlKVxuICAgIGNvbnN0IHJlc3VsdDogTWVzc2FnZU9iamVjdFtdID0gW11cbiAgICBmb3IgKGNvbnN0IG1hcmtlciBvZiBtYXJrZXJzKSB7XG4gICAgICBjb25zdCByZXMgPSB0aGlzLm1hcmtlclByb3BzLmdldChtYXJrZXIpXG4gICAgICBpZiAoIXJlcykgeyBjb250aW51ZSB9XG4gICAgICByZXN1bHQucHVzaChyZXMubWVzc2FnZSlcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdFxuICB9XG5cbiAgcHJpdmF0ZSByZWdpc3Rlckd1dHRlckV2ZW50cyAoKSB7XG4gICAgdGhpcy5kaXNwb3NhYmxlcy5hZGQobGlzdGVuKFxuICAgICAgdGhpcy5ndXR0ZXJFbGVtZW50LCAnbW91c2VvdmVyJywgJy5kZWNvcmF0aW9uJyxcbiAgICAgIChlKSA9PiB7XG4gICAgICAgIGNvbnN0IGJ1ZmZlclB0ID0gYnVmZmVyUG9zaXRpb25Gcm9tTW91c2VFdmVudCh0aGlzLmVkaXRvciwgZSBhcyBNb3VzZUV2ZW50KVxuICAgICAgICBpZiAoYnVmZmVyUHQpIHtcbiAgICAgICAgICBjb25zdCBtc2cgPSB0aGlzLmdldE1lc3NhZ2VBdChidWZmZXJQdCwgJ2d1dHRlcicpXG4gICAgICAgICAgaWYgKG1zZy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB0aGlzLnRvb2x0aXBSZWdpc3RyeS5zaG93VG9vbHRpcChcbiAgICAgICAgICAgICAgdGhpcy5lZGl0b3IsICdtb3VzZScsXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBwbHVnaW5OYW1lOiAnYnVpbHRpbjpjaGVjay1yZXN1bHRzJyxcbiAgICAgICAgICAgICAgICB0b29sdGlwOiB7XG4gICAgICAgICAgICAgICAgICB0ZXh0OiBtc2csXG4gICAgICAgICAgICAgICAgICByYW5nZTogbmV3IFJhbmdlKGJ1ZmZlclB0LCBidWZmZXJQdClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIClcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICApKVxuICAgIHRoaXMuZGlzcG9zYWJsZXMuYWRkKGxpc3RlbihcbiAgICAgIHRoaXMuZ3V0dGVyRWxlbWVudCwgJ21vdXNlb3V0JywgJy5kZWNvcmF0aW9uJywgKGUpID0+XG4gICAgICAgIHRoaXMudG9vbHRpcFJlZ2lzdHJ5LmhpZGVUb29sdGlwKHRoaXMuZWRpdG9yLCAnbW91c2UnLCAnYnVpbHRpbjpjaGVjay1yZXN1bHRzJylcbiAgICApKVxuICB9XG5cbiAgcHJpdmF0ZSB1cGRhdGVSZXN1bHRzIChyZXM6IFJlc3VsdHNEQikge1xuICAgIHRoaXMubWFya2Vycy5jbGVhcigpXG4gICAgY29uc3QgcGF0aCA9IHRoaXMuZWRpdG9yLmdldFBhdGgoKVxuICAgIGZvciAoY29uc3QgciBvZiByZXMuZmlsdGVyKCh7dXJpfSkgPT4gdXJpID09PSBwYXRoKSkge1xuICAgICAgdGhpcy5tYXJrZXJGcm9tQ2hlY2tSZXN1bHQocilcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIG1hcmtlckZyb21DaGVja1Jlc3VsdCAocmVzSXRlbTogUmVzdWx0SXRlbSkge1xuICAgIGNvbnN0IHtwb3NpdGlvbn0gPSByZXNJdGVtXG4gICAgaWYgKCFwb3NpdGlvbikgeyByZXR1cm4gfVxuXG4gICAgY29uc3QgcmFuZ2UgPSBuZXcgUmFuZ2UocG9zaXRpb24sIFBvaW50LmZyb21PYmplY3QoW3Bvc2l0aW9uLnJvdywgcG9zaXRpb24uY29sdW1uICsgMV0pKVxuICAgIGNvbnN0IG1hcmtlciA9IHRoaXMubWFya2Vycy5tYXJrQnVmZmVyUmFuZ2UocmFuZ2UsIHsgaW52YWxpZGF0ZTogJ3RvdWNoJyB9KVxuICAgIHRoaXMubWFya2VyUHJvcHMuc2V0KG1hcmtlciwgcmVzSXRlbSlcbiAgICBjb25zdCBkaXNwID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKVxuICAgIGRpc3AuYWRkKFxuICAgICAgbWFya2VyLm9uRGlkRGVzdHJveSgoKSA9PiB7XG4gICAgICAgIHRoaXMubWFya2VyUHJvcHMuZGVsZXRlKG1hcmtlcilcbiAgICAgICAgZGlzcC5kaXNwb3NlKClcbiAgICAgIH0pLFxuICAgICAgbWFya2VyLm9uRGlkQ2hhbmdlKCh7aXNWYWxpZH06IHtpc1ZhbGlkOiBib29sZWFufSkgPT4ge1xuICAgICAgICByZXNJdGVtLnNldFZhbGlkKGlzVmFsaWQpXG4gICAgICB9KVxuICAgIClcbiAgICB0aGlzLmRlY29yYXRlTWFya2VyKG1hcmtlciwgcmVzSXRlbSlcbiAgfVxuXG4gIHByaXZhdGUgZGVjb3JhdGVNYXJrZXIgKG06IERpc3BsYXlNYXJrZXIsIHI6IFJlc3VsdEl0ZW0pIHtcbiAgICBpZiAoIXRoaXMuZ3V0dGVyKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgY29uc3QgY2xzID0ge2NsYXNzOiBgaWRlLWhhc2tlbGwtJHtyLnNldmVyaXR5fWB9XG4gICAgdGhpcy5ndXR0ZXIuZGVjb3JhdGVNYXJrZXIobSwgeyB0eXBlOiAnbGluZS1udW1iZXInLCAuLi5jbHMgfSlcbiAgICB0aGlzLmVkaXRvci5kZWNvcmF0ZU1hcmtlcihtLCB7IHR5cGU6ICdoaWdobGlnaHQnLCAuLi5jbHMgfSlcbiAgICB0aGlzLmVkaXRvci5kZWNvcmF0ZU1hcmtlcihtLCB7IHR5cGU6ICdsaW5lJywgLi4uY2xzIH0pXG4gIH1cblxuICBwcml2YXRlIGZpbmQgKHBvczogUG9pbnQsIHR5cGU6IFRFdmVudFJhbmdlVHlwZSB8ICdndXR0ZXInKSB7XG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICBjYXNlICdndXR0ZXInOlxuICAgICAgY2FzZSAnc2VsZWN0aW9uJzogLy8gVE9ETzogdGhpcyBpcyBub3QgZ29vZFxuICAgICAgICByZXR1cm4gdGhpcy5tYXJrZXJzLmZpbmRNYXJrZXJzKHsgc3RhcnRCdWZmZXJSb3c6IHBvcy5yb3cgfSlcbiAgICAgIGNhc2UgJ2tleWJvYXJkJzpcbiAgICAgICAgcmV0dXJuIHRoaXMubWFya2Vycy5maW5kTWFya2Vycyh7IHN0YXJ0QnVmZmVyUG9zaXRpb246IHBvcyB9KVxuICAgICAgY2FzZSAnbW91c2UnOlxuICAgICAgY2FzZSAnY29udGV4dCc6XG4gICAgICAgIHJldHVybiB0aGlzLm1hcmtlcnMuZmluZE1hcmtlcnMoeyBjb250YWluc0J1ZmZlclBvc2l0aW9uOiBwb3MgfSlcbiAgICAgIGRlZmF1bHQ6IHRocm93IG5ldyBUeXBlRXJyb3IoJ1N3aXRjaCBhc3NlcnRpb24gZmFpbGVkJylcbiAgICB9XG4gIH1cbn1cbiJdfQ==