import {Modal} from './modal'

const text = 'Enter device password:'

class PasswordModal extends Modal {

	constructor(explainer) {
		super(text)
		this._constructForm(explainer)

		this._submitHandler = this._submitHandler.bind(this)
	}

	_constructForm(explainer) {
		const content = this.el.querySelector('.modal__content')
		const template = document.body.querySelector('.password-modal')
		const importedNode = document.importNode(template.content, true)
		this.passwordPicker = importedNode.children[0]
		if (!explainer) {
			const explainerEl = this.passwordPicker.querySelector('.pick-password__explainer')
			this.passwordPicker.removeChild(explainerEl)
		}
		content.appendChild(importedNode)
	}

	show() {
		super.show()
		const pickPasswordBtn = this.passwordPicker.querySelector('.pick-password__button')
		const showPassword = this.passwordPicker.querySelector('.pick-password__show')
		pickPasswordBtn.addEventListener('click', this._submitHandler)
		showPassword.addEventListener('click', this._showPasswordHandler)
	}

	hide(event, submit) {
		const isHide = super.hide(event)
		if (isHide === false) {
			return
		}
		const input = this.el.querySelector('.input')
		input.value = ''
		const pickPasswordBtn = this.passwordPicker.querySelector('.pick-password__button')
		const showPassword = this.passwordPicker.querySelector('.pick-password__show')
		pickPasswordBtn.removeEventListener('click', this._submitHandler)
		showPassword.removeEventListener('click', this._showPasswordHandler)

		if (submit !== true) {
			this.callback && this.callback('Password Modal Closed')
		}
	}

	_submitHandler() {
		const passwordInput = this.passwordPicker.querySelector('.pick-password__input')
		const savePasswordInput = this.passwordPicker.querySelector('.pick-password__save')

		const password = passwordInput.value
		const save = savePasswordInput.checked

		const pickPasswordBtn = this.passwordPicker.querySelector('.pick-password__button')
		const showPassword = this.passwordPicker.querySelector('.pick-password__show')
		pickPasswordBtn.removeEventListener('click', this._submitHandler)
		showPassword.removeEventListener('click', this._showPasswordHandler)

		this.hide(null, true)
		this.callback && this.callback(null, {password, save})
	}
	
	_showPasswordHandler(event) {
		const inputId = event.target.getAttribute('data-for')
		const input = document.body.querySelector(`#${inputId}`)
		if (event.target.checked) {
			input.type = 'text'
		} else {
			input.type = 'password'
		}
	}

	request() {
		this.show()
		const promise = new Promise((resolve, reject) => {
			this.callback = (err, result) => {
				this.callback = null
				if (err) {
					reject(err)
				}
				resolve(result)
			}
		})

		return promise
	}
}

export {PasswordModal}