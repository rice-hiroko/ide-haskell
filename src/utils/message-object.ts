import highlight = require('atom-highlight')

function isTextMessage (msg: UPI.TMessage): msg is UPI.IMessageText {
  return !!(msg && (msg as UPI.IMessageText).text)
}

function isHTMLMessage (msg: UPI.TMessage): msg is UPI.IMessageHTML {
  return !!(msg && (msg as UPI.IMessageHTML).html)
}

function isIMessageObject (msg: UPI.TMessage | UPI.IMessageObject): msg is UPI.IMessageObject {
  return !!(msg && (msg as UPI.IMessageObject).toHtml && (msg as UPI.IMessageObject).raw)
}

export class MessageObject implements UPI.IMessageObject {
  public static fromObject (message: UPI.TMessage | UPI.IMessageObject): UPI.IMessageObject {
    if (isIMessageObject(message)) {
      return message
    } else {
      return new MessageObject(message)
    }
  }

  private htmlCache?: string
  constructor (private msg: UPI.TMessage) {
    // noop
  }

  public toHtml (linter: boolean = false): string {
    if (this.htmlCache !== undefined) { return this.htmlCache }
    if (isTextMessage(this.msg) && this.msg.highlighter) {
      const html = highlight({
        fileContents: this.msg.text,
        scopeName: this.msg.highlighter,
        nbsp: linter,
        lineDivs: linter,
      })
      if (html) { return this.htmlCache = html }

      this.msg.highlighter = undefined
      return this.toHtml()
    } else if (isHTMLMessage(this.msg)) {
      return this.htmlCache = this.msg.html
    } else {
      let text: string
      if (isTextMessage(this.msg)) {
        text = this.msg.text
      } else {
        text = this.msg
      }
      const div = document.createElement('div')
      div.innerText = text
      return this.htmlCache = div.innerHTML
    }
  }

  public raw (): string {
    if (isTextMessage(this.msg)) {
      return this.msg.text
    } else if (isHTMLMessage(this.msg)) {
      return this.msg.html
    } else {
      return this.msg
    }
  }
}
