import { CompositeDisposable, Disposable } from 'atom'

import { PluginManager } from '../plugin-manager'
import { MAIN_MENU_LABEL } from '../utils'

export * from './instance'

export function consume(pluginManager: PluginManager, options: UPI.IRegistrationOptions): Disposable {
  const { name, menu, messageTypes, events, controls, params, tooltip } = options
  const disp = new CompositeDisposable()

  if (menu) {
    const menuDisp = atom.menu.add([{
      label: MAIN_MENU_LABEL,
      submenu: [{ label: menu.label, submenu: menu.menu }],
    }])
    disp.add(menuDisp)
  }
  if (messageTypes) {
    // TODO: make disposable
    for (const type of Object.keys(messageTypes)) {
      const opts = messageTypes[type]
      // tslint:disable-next-line:no-floating-promises
      pluginManager.outputPanel.createTab(type, opts)
    }
  }
  if (events) {
    if (events.onWillSaveBuffer) {
      disp.add(registerEvent(events.onWillSaveBuffer, pluginManager.onWillSaveBuffer.bind(pluginManager)))
    }
    if (events.onDidSaveBuffer) {
      disp.add(registerEvent(events.onDidSaveBuffer, pluginManager.onDidSaveBuffer.bind(pluginManager)))
    }
    if (events.onDidStopChanging) {
      disp.add(registerEvent(events.onDidStopChanging, pluginManager.onDidStopChanging.bind(pluginManager)))
    }
  }
  if (tooltip) {
    let handler: UPI.TTooltipHandler
    let priority: number | undefined
    let eventTypes: UPI.TEventRangeType[] | undefined
    if (typeof tooltip === 'function') {
      handler = tooltip
    } else {
      ({ handler, priority, eventTypes } = tooltip)
    }
    if (!priority) { priority = 100 }
    disp.add(pluginManager.tooltipRegistry.register(name, { priority, handler, eventTypes }))
  }
  if (controls) {
    for (const i of controls) {
      disp.add(pluginManager.outputPanel.addPanelControl(i))
    }
  }
  if (params) {
    for (const paramName of Object.keys(params)) {
      const spec = params[paramName]
      disp.add(
        pluginManager.configParamManager.add(name, paramName, spec),
      )
    }
  }

  return disp
}

function registerEvent(
  cb: UPI.TSingleOrArray<UPI.TTextBufferCallback>,
  reg: (cb: UPI.TTextBufferCallback) => Disposable,
) {
  if (Array.isArray(cb)) {
    const disp = new CompositeDisposable()
    for (const i of cb) {
      disp.add(reg(i))
    }
    return disp
  } else {
    return reg(cb)
  }
}
