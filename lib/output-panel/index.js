"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const etch = require("etch");
const atom_1 = require("atom");
const output_panel_buttons_1 = require("./views/output-panel-buttons");
const output_panel_checkbox_1 = require("./views/output-panel-checkbox");
const progress_bar_1 = require("./views/progress-bar");
const output_panel_items_1 = require("./views/output-panel-items");
const status_icon_1 = require("./views/status-icon");
const utils_1 = require("../utils");
const $ = etch.dom;
class OutputPanel {
    constructor(state = { fileFilter: false, activeTab: 'error' }) {
        this.state = state;
        this.elements = new Set();
        this.disposables = new atom_1.CompositeDisposable();
        this.currentResult = 0;
        this.statusMap = new Map();
        this.progress = [];
        this.tabs = new Map();
        this.switchFileFilter = () => {
            this.state.fileFilter = !this.state.fileFilter;
            this.updateItems();
        };
        etch.initialize(this);
        for (const tab of ['error', 'warning', 'lint']) {
            this.createTab(tab, {});
        }
        this.disposables.add(atom.workspace.onDidChangeActivePaneItem(() => {
            if (this.state.fileFilter)
                this.updateItems();
        }));
        setImmediate(() => __awaiter(this, void 0, void 0, function* () {
            yield this.show();
            if (atom.config.get('ide-haskell.autoHideOutput')) {
                this.hide();
            }
        }));
    }
    connectResults(results) {
        if (this.results)
            throw new Error('Results already connected!');
        this.results = results;
        const didUpdate = (severities) => {
            this.currentResult = 0;
            this.updateItems();
            if (atom.config.get('ide-haskell.autoHideOutput') && (!this.results || this.results.isEmpty(severities))) {
                this.hide();
            }
            else if (atom.config.get('ide-haskell.switchTabOnCheck')) {
                this.show();
                this.activateFirstNonEmptyTab(severities);
            }
        };
        this.disposables.add(this.results.onDidUpdate(didUpdate));
        this.update();
    }
    render() {
        if (!this.results) {
            return etch.dom("ide-haskell-panel", null);
        }
        return (etch.dom("ide-haskell-panel", null,
            etch.dom("ide-haskell-panel-heading", null,
                etch.dom(status_icon_1.StatusIcon, { statusMap: this.statusMap }),
                etch.dom(output_panel_buttons_1.OutputPanelButtons, { buttons: Array.from(this.tabs.values()), activeBtn: this.state.activeTab }),
                etch.dom(output_panel_checkbox_1.OutputPanelCheckbox, { class: "ide-haskell-checkbox--uri-filter", state: this.state.fileFilter || false, onSwitched: this.switchFileFilter, enabledHint: "Show current file messages", disabledHint: "Show all project messages" }),
                Array.from(this.elements.values()),
                etch.dom(progress_bar_1.ProgressBar, { progress: this.progress })),
            etch.dom(output_panel_items_1.OutputPanelItems, { model: this.results, filter: this.itemFilter || (() => true), ref: "items" })));
    }
    update() {
        return __awaiter(this, void 0, void 0, function* () {
            return etch.update(this);
        });
    }
    destroy() {
        this.hide();
    }
    reallyDestroy() {
        return __awaiter(this, void 0, void 0, function* () {
            yield etch.destroy(this);
            this.disposables.dispose();
        });
    }
    toggle() {
        return __awaiter(this, void 0, void 0, function* () {
            const pane = atom.workspace.paneContainerForItem(this);
            if (!pane || utils_1.isDock(pane) && !pane.isVisible()) {
                return this.show();
            }
            else {
                return this.hide();
            }
        });
    }
    show() {
        return __awaiter(this, void 0, void 0, function* () {
            yield atom.workspace.open(this, { searchAllPanes: true, activatePane: false });
            const pane = atom.workspace.paneContainerForItem(this);
            if (pane && utils_1.isDock(pane)) {
                pane.show();
            }
        });
    }
    hide() {
        const pane = atom.workspace.paneContainerForItem(this);
        if (pane && utils_1.isDock(pane)) {
            atom.workspace.hide(this);
        }
    }
    getTitle() {
        return 'IDE-Haskell';
    }
    getURI() {
        return `ide-haskell://output-panel/`;
    }
    getDefaultLocation() {
        return atom.config.get('ide-haskell.panelPosition');
    }
    addPanelControl(def) {
        let newElement;
        if (utils_1.isSimpleControlDef(def)) {
            const { events, classes, style, attrs } = def.opts;
            const props = {};
            if (classes) {
                props.class = classes.join(' ');
            }
            if (style) {
                props.style = style;
            }
            if (attrs) {
                props.attributes = attrs;
            }
            if (events) {
                props.on = events;
            }
            newElement = $(def.element, props);
        }
        else {
            newElement = $(def.element, def.opts);
        }
        this.elements.add(newElement);
        this.update();
        return new atom_1.Disposable(() => {
            this.elements.delete(newElement);
            this.update();
        });
    }
    updateItems() {
        return __awaiter(this, void 0, void 0, function* () {
            const activeTab = this.getActiveTab();
            let currentUri;
            if (this.state.fileFilter) {
                const ed = atom.workspace.getActiveTextEditor();
                currentUri = ed && ed.getPath();
            }
            let scroll = false;
            if (activeTab) {
                const ato = this.tabs.get(activeTab);
                if (currentUri && ato && ato.uriFilter) {
                    this.itemFilter = ({ uri, severity }) => (severity === activeTab) && (uri === currentUri);
                }
                else {
                    this.itemFilter = ({ severity }) => severity === activeTab;
                }
                scroll = (ato && ato.autoScroll && this.refs.items && this.refs.items.atEnd()) || false;
            }
            if (this.results) {
                for (const [btn, ato] of this.tabs.entries()) {
                    ato.count = Array.from(this.results.filter(({ severity }) => (severity === btn))).length;
                }
            }
            yield this.update();
            if (scroll && this.refs.items)
                yield this.refs.items.scrollToEnd();
        });
    }
    activateTab(tab) {
        this.state.activeTab = tab;
        this.updateItems();
    }
    activateFirstNonEmptyTab(severities) {
        const sevs = severities;
        for (const i of sevs) {
            const tab = this.tabs.get(i);
            if (!tab)
                continue;
            const count = tab.count;
            if (count && count > 0) {
                this.activateTab(i);
                break;
            }
        }
    }
    showItem(item) {
        this.activateTab(item.severity);
        this.refs.items && this.refs.items.showItem(item);
    }
    getActiveTab() {
        return this.state.activeTab;
    }
    createTab(name, { uriFilter = true, autoScroll = false }) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!Array.from(this.tabs.keys()).includes(name)) {
                this.tabs.set(name, {
                    name,
                    count: 0,
                    onClick: () => this.activateTab(name),
                    uriFilter,
                    autoScroll,
                });
                this.state.activeTab && this.activateTab(this.state.activeTab);
            }
            return this.update();
        });
    }
    serialize() {
        return Object.assign({}, this.state, { deserializer: 'ide-haskell/OutputPanel' });
    }
    backendStatus(pluginName, st) {
        this.statusMap.set(pluginName, st);
        this.progress =
            Array.from(this.statusMap.values())
                .reduce((cv, i) => {
                if (i.status === 'progress' && i.progress !== undefined) {
                    cv.push(i.progress);
                }
                return cv;
            }, []);
        this.update();
    }
    showNextError() {
        if (!this.results)
            return;
        const rs = Array.from(this.results.filter(({ uri }) => !!uri));
        if (rs.length === 0) {
            return;
        }
        this.currentResult++;
        if (this.currentResult >= rs.length) {
            this.currentResult = 0;
        }
        this.showItem(rs[this.currentResult]);
    }
    showPrevError() {
        if (!this.results)
            return;
        const rs = Array.from(this.results.filter(({ uri }) => !!uri));
        if (rs.length === 0) {
            return;
        }
        this.currentResult--;
        if (this.currentResult < 0) {
            this.currentResult = rs.length - 1;
        }
        this.showItem(rs[this.currentResult]);
    }
}
exports.OutputPanel = OutputPanel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvb3V0cHV0LXBhbmVsL2luZGV4LnRzeCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEsNkJBQTRCO0FBQzVCLCtCQUFzRDtBQUN0RCx1RUFBMkU7QUFDM0UseUVBQW1FO0FBQ25FLHVEQUFrRDtBQUNsRCxtRUFBNkQ7QUFFN0QscURBQWdEO0FBQ2hELG9DQUFxRDtBQUNyRCxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFBO0FBU2xCO0lBYUUsWUFBb0IsUUFBZ0IsRUFBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUM7UUFBdkQsVUFBSyxHQUFMLEtBQUssQ0FBa0Q7UUFSbkUsYUFBUSxHQUFxQixJQUFJLEdBQUcsRUFBRSxDQUFBO1FBQ3RDLGdCQUFXLEdBQXdCLElBQUksMEJBQW1CLEVBQUUsQ0FBQTtRQUM1RCxrQkFBYSxHQUFXLENBQUMsQ0FBQTtRQUN6QixjQUFTLEdBQTZCLElBQUksR0FBRyxFQUFFLENBQUE7UUFDL0MsYUFBUSxHQUFhLEVBQUUsQ0FBQTtRQUN2QixTQUFJLEdBQTBCLElBQUksR0FBRyxFQUFFLENBQUE7UUE0UXZDLHFCQUFnQixHQUFHLEdBQUcsRUFBRTtZQUM5QixJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFBO1lBRTlDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUNwQixDQUFDLENBQUE7UUE1UUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUVyQixHQUFHLENBQUMsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRS9DLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3pC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QUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM5RCxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFBQyxNQUFNLENBQUE7UUFBQyxDQUFDO1FBRS9CLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUNwQixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFBQyxJQUFJLENBQUMsYUFBYSxHQUFHLEVBQUUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO1FBQUMsQ0FBQztRQUVsRSxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0NBT0Y7QUEzUkQsa0NBMlJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZXRjaCBmcm9tICdldGNoJ1xuaW1wb3J0IHsgRGlzcG9zYWJsZSwgQ29tcG9zaXRlRGlzcG9zYWJsZSB9IGZyb20gJ2F0b20nXG5pbXBvcnQgeyBJQnRuRGVzYywgT3V0cHV0UGFuZWxCdXR0b25zIH0gZnJvbSAnLi92aWV3cy9vdXRwdXQtcGFuZWwtYnV0dG9ucydcbmltcG9ydCB7IE91dHB1dFBhbmVsQ2hlY2tib3ggfSBmcm9tICcuL3ZpZXdzL291dHB1dC1wYW5lbC1jaGVja2JveCdcbmltcG9ydCB7IFByb2dyZXNzQmFyIH0gZnJvbSAnLi92aWV3cy9wcm9ncmVzcy1iYXInXG5pbXBvcnQgeyBPdXRwdXRQYW5lbEl0ZW1zIH0gZnJvbSAnLi92aWV3cy9vdXRwdXQtcGFuZWwtaXRlbXMnXG5pbXBvcnQgeyBSZXN1bHRzREIsIFJlc3VsdEl0ZW0gfSBmcm9tICcuLi9yZXN1bHRzLWRiJ1xuaW1wb3J0IHsgU3RhdHVzSWNvbiB9IGZyb20gJy4vdmlld3Mvc3RhdHVzLWljb24nXG5pbXBvcnQgeyBpc0RvY2ssIGlzU2ltcGxlQ29udHJvbERlZiB9IGZyb20gJy4uL3V0aWxzJ1xuY29uc3QgJCA9IGV0Y2guZG9tXG5cbmV4cG9ydCBpbnRlcmZhY2UgSVN0YXRlIHtcbiAgZmlsZUZpbHRlcjogYm9vbGVhblxuICBhY3RpdmVUYWI6IHN0cmluZ1xufVxuXG5leHBvcnQgdHlwZSBUUGFuZWxQb3NpdGlvbiA9ICdib3R0b20nIHwgJ2xlZnQnIHwgJ3RvcCcgfCAncmlnaHQnXG5cbmV4cG9ydCBjbGFzcyBPdXRwdXRQYW5lbCB7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby11bmluaXRpYWxpemVkXG4gIHByaXZhdGUgcmVmczoge1xuICAgIGl0ZW1zPzogT3V0cHV0UGFuZWxJdGVtc1xuICB9XG4gIHByaXZhdGUgZWxlbWVudHM6IFNldDxKU1guRWxlbWVudD4gPSBuZXcgU2V0KClcbiAgcHJpdmF0ZSBkaXNwb3NhYmxlczogQ29tcG9zaXRlRGlzcG9zYWJsZSA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlKClcbiAgcHJpdmF0ZSBjdXJyZW50UmVzdWx0OiBudW1iZXIgPSAwXG4gIHByaXZhdGUgc3RhdHVzTWFwOiBNYXA8c3RyaW5nLCBVUEkuSVN0YXR1cz4gPSBuZXcgTWFwKClcbiAgcHJpdmF0ZSBwcm9ncmVzczogbnVtYmVyW10gPSBbXVxuICBwcml2YXRlIHRhYnM6IE1hcDxzdHJpbmcsIElCdG5EZXNjPiA9IG5ldyBNYXAoKVxuICBwcml2YXRlIGl0ZW1GaWx0ZXI/OiAoaXRlbTogUmVzdWx0SXRlbSkgPT4gYm9vbGVhblxuICBwcml2YXRlIHJlc3VsdHM/OiBSZXN1bHRzREJcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBzdGF0ZTogSVN0YXRlID0ge2ZpbGVGaWx0ZXI6IGZhbHNlLCBhY3RpdmVUYWI6ICdlcnJvcid9KSB7XG4gICAgZXRjaC5pbml0aWFsaXplKHRoaXMpXG5cbiAgICBmb3IgKGNvbnN0IHRhYiBvZiBbJ2Vycm9yJywgJ3dhcm5pbmcnLCAnbGludCddKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tZmxvYXRpbmctcHJvbWlzZXNcbiAgICAgIHRoaXMuY3JlYXRlVGFiKHRhYiwge30pXG4gICAgfVxuXG4gICAgdGhpcy5kaXNwb3NhYmxlcy5hZGQoYXRvbS53b3Jrc3BhY2Uub25EaWRDaGFuZ2VBY3RpdmVQYW5lSXRlbSgoKSA9PiB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tZmxvYXRpbmctcHJvbWlzZXNcbiAgICAgIGlmICh0aGlzLnN0YXRlLmZpbGVGaWx0ZXIpIHRoaXMudXBkYXRlSXRlbXMoKVxuICAgIH0pKVxuICAgIHNldEltbWVkaWF0ZShhc3luYyAoKSA9PiB7XG4gICAgICBhd2FpdCB0aGlzLnNob3coKVxuICAgICAgaWYgKGF0b20uY29uZmlnLmdldCgnaWRlLWhhc2tlbGwuYXV0b0hpZGVPdXRwdXQnKSkge1xuICAgICAgICB0aGlzLmhpZGUoKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBwdWJsaWMgY29ubmVjdFJlc3VsdHMocmVzdWx0czogUmVzdWx0c0RCKSB7XG4gICAgaWYgKHRoaXMucmVzdWx0cykgdGhyb3cgbmV3IEVycm9yKCdSZXN1bHRzIGFscmVhZHkgY29ubmVjdGVkIScpXG4gICAgdGhpcy5yZXN1bHRzID0gcmVzdWx0c1xuXG4gICAgY29uc3QgZGlkVXBkYXRlID0gKHNldmVyaXRpZXM6IFVQSS5UU2V2ZXJpdHlbXSkgPT4ge1xuICAgICAgdGhpcy5jdXJyZW50UmVzdWx0ID0gMFxuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWZsb2F0aW5nLXByb21pc2VzXG4gICAgICB0aGlzLnVwZGF0ZUl0ZW1zKClcbiAgICAgIGlmIChhdG9tLmNvbmZpZy5nZXQoJ2lkZS1oYXNrZWxsLmF1dG9IaWRlT3V0cHV0JykgJiYgKCF0aGlzLnJlc3VsdHMgfHwgdGhpcy5yZXN1bHRzLmlzRW1wdHkoc2V2ZXJpdGllcykpKSB7XG4gICAgICAgIHRoaXMuaGlkZSgpXG4gICAgICB9IGVsc2UgaWYgKGF0b20uY29uZmlnLmdldCgnaWRlLWhhc2tlbGwuc3dpdGNoVGFiT25DaGVjaycpKSB7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1mbG9hdGluZy1wcm9taXNlc1xuICAgICAgICB0aGlzLnNob3coKVxuICAgICAgICB0aGlzLmFjdGl2YXRlRmlyc3ROb25FbXB0eVRhYihzZXZlcml0aWVzKVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuZGlzcG9zYWJsZXMuYWRkKHRoaXMucmVzdWx0cy5vbkRpZFVwZGF0ZShkaWRVcGRhdGUpKVxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1mbG9hdGluZy1wcm9taXNlc1xuICAgIHRoaXMudXBkYXRlKClcbiAgfVxuXG4gIHB1YmxpYyByZW5kZXIoKSB7XG4gICAgaWYgKCF0aGlzLnJlc3VsdHMpIHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby11bnNhZmUtYW55XG4gICAgICByZXR1cm4gPGlkZS1oYXNrZWxsLXBhbmVsLz5cbiAgICB9XG4gICAgcmV0dXJuIChcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlOm5vLXVuc2FmZS1hbnlcbiAgICAgIDxpZGUtaGFza2VsbC1wYW5lbD5cbiAgICAgICAgPGlkZS1oYXNrZWxsLXBhbmVsLWhlYWRpbmc+XG4gICAgICAgICAgPFN0YXR1c0ljb24gc3RhdHVzTWFwPXt0aGlzLnN0YXR1c01hcH0gLz5cbiAgICAgICAgICA8T3V0cHV0UGFuZWxCdXR0b25zXG4gICAgICAgICAgICBidXR0b25zPXtBcnJheS5mcm9tKHRoaXMudGFicy52YWx1ZXMoKSl9XG4gICAgICAgICAgICBhY3RpdmVCdG49e3RoaXMuc3RhdGUuYWN0aXZlVGFifVxuICAgICAgICAgIC8+XG4gICAgICAgICAgPE91dHB1dFBhbmVsQ2hlY2tib3hcbiAgICAgICAgICAgIGNsYXNzPVwiaWRlLWhhc2tlbGwtY2hlY2tib3gtLXVyaS1maWx0ZXJcIlxuICAgICAgICAgICAgc3RhdGU9e3RoaXMuc3RhdGUuZmlsZUZpbHRlciB8fCBmYWxzZX1cbiAgICAgICAgICAgIG9uU3dpdGNoZWQ9e3RoaXMuc3dpdGNoRmlsZUZpbHRlcn1cbiAgICAgICAgICAgIGVuYWJsZWRIaW50PVwiU2hvdyBjdXJyZW50IGZpbGUgbWVzc2FnZXNcIlxuICAgICAgICAgICAgZGlzYWJsZWRIaW50PVwiU2hvdyBhbGwgcHJvamVjdCBtZXNzYWdlc1wiXG4gICAgICAgICAgLz5cbiAgICAgICAgICB7QXJyYXkuZnJvbSh0aGlzLmVsZW1lbnRzLnZhbHVlcygpKX1cbiAgICAgICAgICA8UHJvZ3Jlc3NCYXIgcHJvZ3Jlc3M9e3RoaXMucHJvZ3Jlc3N9IC8+XG4gICAgICAgIDwvaWRlLWhhc2tlbGwtcGFuZWwtaGVhZGluZz5cbiAgICAgICAgPE91dHB1dFBhbmVsSXRlbXNcbiAgICAgICAgICBtb2RlbD17dGhpcy5yZXN1bHRzfVxuICAgICAgICAgIGZpbHRlcj17dGhpcy5pdGVtRmlsdGVyIHx8ICgoKSA9PiB0cnVlKX1cbiAgICAgICAgICByZWY9XCJpdGVtc1wiXG4gICAgICAgIC8+XG4gICAgICA8L2lkZS1oYXNrZWxsLXBhbmVsPlxuICAgICAgLy8gdHNsaW50OmVuYWJsZTpuby11bnNhZmUtYW55XG4gICAgKVxuICB9XG5cbiAgcHVibGljIGFzeW5jIHVwZGF0ZSgpIHtcbiAgICByZXR1cm4gZXRjaC51cGRhdGUodGhpcylcbiAgfVxuXG4gIHB1YmxpYyBkZXN0cm95KCkge1xuICAgIHRoaXMuaGlkZSgpXG4gIH1cblxuICBwdWJsaWMgYXN5bmMgcmVhbGx5RGVzdHJveSgpIHtcbiAgICBhd2FpdCBldGNoLmRlc3Ryb3kodGhpcylcbiAgICB0aGlzLmRpc3Bvc2FibGVzLmRpc3Bvc2UoKVxuICB9XG5cbiAgcHVibGljIGFzeW5jIHRvZ2dsZSgpIHtcbiAgICBjb25zdCBwYW5lID0gYXRvbS53b3Jrc3BhY2UucGFuZUNvbnRhaW5lckZvckl0ZW0odGhpcylcbiAgICBpZiAoIXBhbmUgfHwgaXNEb2NrKHBhbmUpICYmICFwYW5lLmlzVmlzaWJsZSgpKSB7XG4gICAgICByZXR1cm4gdGhpcy5zaG93KClcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuaGlkZSgpXG4gICAgfVxuICB9XG5cbiAgcHVibGljIGFzeW5jIHNob3coKSB7XG4gICAgYXdhaXQgYXRvbS53b3Jrc3BhY2Uub3Blbih0aGlzLCB7IHNlYXJjaEFsbFBhbmVzOiB0cnVlLCBhY3RpdmF0ZVBhbmU6IGZhbHNlIH0pXG4gICAgY29uc3QgcGFuZSA9IGF0b20ud29ya3NwYWNlLnBhbmVDb250YWluZXJGb3JJdGVtKHRoaXMpXG4gICAgaWYgKHBhbmUgJiYgaXNEb2NrKHBhbmUpKSB7IHBhbmUuc2hvdygpIH1cbiAgfVxuXG4gIHB1YmxpYyBoaWRlKCkge1xuICAgIGNvbnN0IHBhbmUgPSBhdG9tLndvcmtzcGFjZS5wYW5lQ29udGFpbmVyRm9ySXRlbSh0aGlzKVxuICAgIGlmIChwYW5lICYmIGlzRG9jayhwYW5lKSkgeyBhdG9tLndvcmtzcGFjZS5oaWRlKHRoaXMpIH1cbiAgfVxuXG4gIHB1YmxpYyBnZXRUaXRsZSgpIHtcbiAgICByZXR1cm4gJ0lERS1IYXNrZWxsJ1xuICB9XG5cbiAgcHVibGljIGdldFVSSSgpIHtcbiAgICByZXR1cm4gYGlkZS1oYXNrZWxsOi8vb3V0cHV0LXBhbmVsL2BcbiAgfVxuXG4gIHB1YmxpYyBnZXREZWZhdWx0TG9jYXRpb24oKSB7XG4gICAgcmV0dXJuIGF0b20uY29uZmlnLmdldCgnaWRlLWhhc2tlbGwucGFuZWxQb3NpdGlvbicpXG4gIH1cblxuICBwdWJsaWMgYWRkUGFuZWxDb250cm9sPFQ+KGRlZjogVVBJLlRDb250cm9sRGVmaW5pdGlvbjxUPikge1xuICAgIGxldCBuZXdFbGVtZW50OiBKU1guRWxlbWVudFxuICAgIGlmIChpc1NpbXBsZUNvbnRyb2xEZWYoZGVmKSkge1xuICAgICAgY29uc3QgeyBldmVudHMsIGNsYXNzZXMsIHN0eWxlLCBhdHRycyB9ID0gZGVmLm9wdHNcbiAgICAgIGNvbnN0IHByb3BzOiB7IFtrZXk6IHN0cmluZ106IE9iamVjdCB9ID0ge31cbiAgICAgIGlmIChjbGFzc2VzKSB7IHByb3BzLmNsYXNzID0gY2xhc3Nlcy5qb2luKCcgJykgfVxuICAgICAgaWYgKHN0eWxlKSB7IHByb3BzLnN0eWxlID0gc3R5bGUgfVxuICAgICAgaWYgKGF0dHJzKSB7IHByb3BzLmF0dHJpYnV0ZXMgPSBhdHRycyB9XG4gICAgICBpZiAoZXZlbnRzKSB7IHByb3BzLm9uID0gZXZlbnRzIH1cblxuICAgICAgbmV3RWxlbWVudCA9ICQoZGVmLmVsZW1lbnQsIHByb3BzKVxuICAgIH0gZWxzZSB7XG4gICAgICBuZXdFbGVtZW50ID0gJChkZWYuZWxlbWVudCwgZGVmLm9wdHMpXG4gICAgfVxuICAgIHRoaXMuZWxlbWVudHMuYWRkKG5ld0VsZW1lbnQpXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWZsb2F0aW5nLXByb21pc2VzXG4gICAgdGhpcy51cGRhdGUoKVxuICAgIHJldHVybiBuZXcgRGlzcG9zYWJsZSgoKSA9PiB7XG4gICAgICB0aGlzLmVsZW1lbnRzLmRlbGV0ZShuZXdFbGVtZW50KVxuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWZsb2F0aW5nLXByb21pc2VzXG4gICAgICB0aGlzLnVwZGF0ZSgpXG4gICAgfSlcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyB1cGRhdGVJdGVtcygpIHtcbiAgICBjb25zdCBhY3RpdmVUYWIgPSB0aGlzLmdldEFjdGl2ZVRhYigpXG4gICAgbGV0IGN1cnJlbnRVcmk6IHN0cmluZyB8IHVuZGVmaW5lZFxuICAgIGlmICh0aGlzLnN0YXRlLmZpbGVGaWx0ZXIpIHtcbiAgICAgIGNvbnN0IGVkID0gYXRvbS53b3Jrc3BhY2UuZ2V0QWN0aXZlVGV4dEVkaXRvcigpXG4gICAgICBjdXJyZW50VXJpID0gZWQgJiYgZWQuZ2V0UGF0aCgpXG4gICAgfVxuICAgIGxldCBzY3JvbGw6IGJvb2xlYW4gPSBmYWxzZVxuICAgIGlmIChhY3RpdmVUYWIpIHtcbiAgICAgIGNvbnN0IGF0byA9IHRoaXMudGFicy5nZXQoYWN0aXZlVGFiKVxuICAgICAgaWYgKGN1cnJlbnRVcmkgJiYgYXRvICYmIGF0by51cmlGaWx0ZXIpIHtcbiAgICAgICAgdGhpcy5pdGVtRmlsdGVyID0gKHsgdXJpLCBzZXZlcml0eSB9KSA9PiAoc2V2ZXJpdHkgPT09IGFjdGl2ZVRhYikgJiYgKHVyaSA9PT0gY3VycmVudFVyaSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuaXRlbUZpbHRlciA9ICh7IHNldmVyaXR5IH0pID0+IHNldmVyaXR5ID09PSBhY3RpdmVUYWJcbiAgICAgIH1cbiAgICAgIHNjcm9sbCA9IChhdG8gJiYgYXRvLmF1dG9TY3JvbGwgJiYgdGhpcy5yZWZzLml0ZW1zICYmIHRoaXMucmVmcy5pdGVtcy5hdEVuZCgpKSB8fCBmYWxzZVxuICAgIH1cblxuICAgIGlmICh0aGlzLnJlc3VsdHMpIHtcbiAgICAgIGZvciAoY29uc3QgW2J0biwgYXRvXSBvZiB0aGlzLnRhYnMuZW50cmllcygpKSB7XG4gICAgICAgIGF0by5jb3VudCA9IEFycmF5LmZyb20odGhpcy5yZXN1bHRzLmZpbHRlcigoeyBzZXZlcml0eSB9KSA9PiAoc2V2ZXJpdHkgPT09IGJ0bikpKS5sZW5ndGhcbiAgICAgIH1cbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLnVwZGF0ZSgpXG5cbiAgICBpZiAoc2Nyb2xsICYmIHRoaXMucmVmcy5pdGVtcykgYXdhaXQgdGhpcy5yZWZzLml0ZW1zLnNjcm9sbFRvRW5kKClcbiAgfVxuXG4gIHB1YmxpYyBhY3RpdmF0ZVRhYih0YWI6IHN0cmluZykge1xuICAgIHRoaXMuc3RhdGUuYWN0aXZlVGFiID0gdGFiXG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWZsb2F0aW5nLXByb21pc2VzXG4gICAgdGhpcy51cGRhdGVJdGVtcygpXG4gIH1cblxuICBwdWJsaWMgYWN0aXZhdGVGaXJzdE5vbkVtcHR5VGFiKHNldmVyaXRpZXM6IFVQSS5UU2V2ZXJpdHlbXSkge1xuICAgIGNvbnN0IHNldnM6IFVQSS5UU2V2ZXJpdHlbXSA9IHNldmVyaXRpZXNcbiAgICBmb3IgKGNvbnN0IGkgb2Ygc2V2cykge1xuICAgICAgY29uc3QgdGFiID0gdGhpcy50YWJzLmdldChpKVxuICAgICAgaWYgKCF0YWIpIGNvbnRpbnVlXG4gICAgICBjb25zdCBjb3VudCA9IHRhYi5jb3VudFxuICAgICAgaWYgKGNvdW50ICYmIGNvdW50ID4gMCkge1xuICAgICAgICB0aGlzLmFjdGl2YXRlVGFiKGkpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHVibGljIHNob3dJdGVtKGl0ZW06IFJlc3VsdEl0ZW0pIHtcbiAgICB0aGlzLmFjdGl2YXRlVGFiKGl0ZW0uc2V2ZXJpdHkpXG4gICAgdGhpcy5yZWZzLml0ZW1zICYmIHRoaXMucmVmcy5pdGVtcy5zaG93SXRlbShpdGVtKVxuICB9XG5cbiAgcHVibGljIGdldEFjdGl2ZVRhYigpIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZS5hY3RpdmVUYWJcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBjcmVhdGVUYWIoXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIHsgdXJpRmlsdGVyID0gdHJ1ZSwgYXV0b1Njcm9sbCA9IGZhbHNlIH06IFVQSS5JU2V2ZXJpdHlUYWJEZWZpbml0aW9uLFxuICApIHtcbiAgICBpZiAoIUFycmF5LmZyb20odGhpcy50YWJzLmtleXMoKSkuaW5jbHVkZXMobmFtZSkpIHtcbiAgICAgIHRoaXMudGFicy5zZXQobmFtZSwge1xuICAgICAgICBuYW1lLFxuICAgICAgICBjb3VudDogMCxcbiAgICAgICAgb25DbGljazogKCkgPT4gdGhpcy5hY3RpdmF0ZVRhYihuYW1lKSxcbiAgICAgICAgdXJpRmlsdGVyLFxuICAgICAgICBhdXRvU2Nyb2xsLFxuICAgICAgfSlcbiAgICAgIHRoaXMuc3RhdGUuYWN0aXZlVGFiICYmIHRoaXMuYWN0aXZhdGVUYWIodGhpcy5zdGF0ZS5hY3RpdmVUYWIpXG4gICAgfVxuICAgIHJldHVybiB0aGlzLnVwZGF0ZSgpXG4gIH1cblxuICBwdWJsaWMgc2VyaWFsaXplKCk6IElTdGF0ZSAmIHtkZXNlcmlhbGl6ZXI6ICdpZGUtaGFza2VsbC9PdXRwdXRQYW5lbCd9IHtcbiAgICByZXR1cm4ge1xuICAgICAgLi4udGhpcy5zdGF0ZSxcbiAgICAgIGRlc2VyaWFsaXplcjogJ2lkZS1oYXNrZWxsL091dHB1dFBhbmVsJyxcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgYmFja2VuZFN0YXR1cyhwbHVnaW5OYW1lOiBzdHJpbmcsIHN0OiBVUEkuSVN0YXR1cykge1xuICAgIHRoaXMuc3RhdHVzTWFwLnNldChwbHVnaW5OYW1lLCBzdClcbiAgICB0aGlzLnByb2dyZXNzID1cbiAgICAgIEFycmF5LmZyb20odGhpcy5zdGF0dXNNYXAudmFsdWVzKCkpXG4gICAgICAgIC5yZWR1Y2UoXG4gICAgICAgIChjdiwgaSkgPT4ge1xuICAgICAgICAgIGlmIChpLnN0YXR1cyA9PT0gJ3Byb2dyZXNzJyAmJiBpLnByb2dyZXNzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGN2LnB1c2goaS5wcm9ncmVzcylcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGN2XG4gICAgICAgIH0sXG4gICAgICAgIFtdIGFzIG51bWJlcltdLFxuICAgICAgKVxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1mbG9hdGluZy1wcm9taXNlc1xuICAgIHRoaXMudXBkYXRlKClcbiAgfVxuXG4gIHB1YmxpYyBzaG93TmV4dEVycm9yKCkge1xuICAgIGlmICghdGhpcy5yZXN1bHRzKSByZXR1cm5cbiAgICBjb25zdCBycyA9IEFycmF5LmZyb20odGhpcy5yZXN1bHRzLmZpbHRlcigoeyB1cmkgfSkgPT4gISF1cmkpKVxuICAgIGlmIChycy5sZW5ndGggPT09IDApIHsgcmV0dXJuIH1cblxuICAgIHRoaXMuY3VycmVudFJlc3VsdCsrXG4gICAgaWYgKHRoaXMuY3VycmVudFJlc3VsdCA+PSBycy5sZW5ndGgpIHsgdGhpcy5jdXJyZW50UmVzdWx0ID0gMCB9XG5cbiAgICB0aGlzLnNob3dJdGVtKHJzW3RoaXMuY3VycmVudFJlc3VsdF0pXG4gIH1cblxuICBwdWJsaWMgc2hvd1ByZXZFcnJvcigpIHtcbiAgICBpZiAoIXRoaXMucmVzdWx0cykgcmV0dXJuXG4gICAgY29uc3QgcnMgPSBBcnJheS5mcm9tKHRoaXMucmVzdWx0cy5maWx0ZXIoKHsgdXJpIH0pID0+ICEhdXJpKSlcbiAgICBpZiAocnMubGVuZ3RoID09PSAwKSB7IHJldHVybiB9XG5cbiAgICB0aGlzLmN1cnJlbnRSZXN1bHQtLVxuICAgIGlmICh0aGlzLmN1cnJlbnRSZXN1bHQgPCAwKSB7IHRoaXMuY3VycmVudFJlc3VsdCA9IHJzLmxlbmd0aCAtIDEgfVxuXG4gICAgdGhpcy5zaG93SXRlbShyc1t0aGlzLmN1cnJlbnRSZXN1bHRdKVxuICB9XG5cbiAgcHJpdmF0ZSBzd2l0Y2hGaWxlRmlsdGVyID0gKCkgPT4ge1xuICAgIHRoaXMuc3RhdGUuZmlsZUZpbHRlciA9ICF0aGlzLnN0YXRlLmZpbGVGaWx0ZXJcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tZmxvYXRpbmctcHJvbWlzZXNcbiAgICB0aGlzLnVwZGF0ZUl0ZW1zKClcbiAgfVxufVxuIl19