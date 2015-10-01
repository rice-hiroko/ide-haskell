class OutputPanelItemsView extends HTMLElement
  setModel: (@model) ->

  createdCallback: ->
    @classList.add 'native-key-bindings'
    @setAttribute('tabindex', -1)

  filter: (@activeFilter) ->
    scrollTop = @scrollTop
    @innerHTML = ''
    @items = @model.filter @activeFilter
    for i in @items
      @appendChild atom.views.getView i
    @scrollTop = scrollTop

  showItem: (item) ->
    view = atom.views.getView item
    view.position.click()
    view.scrollIntoView
      block: "start"
      behavior: "smooth"

  scrollToEnd: ->
    @scrollTop = @scrollHeight

  atEnd: ->
    @scrollTop >= (@scrollHeight - @clientHeight)

OutputPanelItemsElement =
  document.registerElement 'ide-haskell-panel-items',
    prototype: OutputPanelItemsView.prototype

module.exports = OutputPanelItemsElement
