class Modal {

	constructor(text) {
		this.text = text
		this.el = this._createEl()

		this.hide = this.hide.bind(this)
	}

	_createEl() {
		const el = document.createElement('div')
		el.classList.add('modal')
		const content = document.createElement('div')
		content.classList.add('modal__content')
		el.appendChild(content)
		this.content = content

		const closeBtn = document.createElement('span')
		closeBtn.classList.add('modal__close')
		closeBtn.textContent = '×'
		content.appendChild(closeBtn)

		if (this.text) {
			const text = document.createElement('p')
			text.classList.add('picker-input')
			text.textContent = this.text
			content.appendChild(text)
		}

		return el
	}

	show() {
		const closeBtn = this.el.querySelector('.modal__close')
		closeBtn.addEventListener('click', this.hide)
		window.addEventListener('click', this.hide)
		document.body.appendChild(this.el)
	}

	hide(event) {
		const closeBtn = this.el.querySelector('.modal__close')
		if (!event || !this.content.contains(event.target) || event.target === closeBtn) {
			closeBtn.removeEventListener('click', this.hide)
			window.removeEventListener('click', this.hide)
			this.el.parentElement.removeChild(this.el)
		} else {
			return false
		}
	}
}

export {Modal}