import {Session} from './session'
import {Keys} from './keys'
import {Vault} from './vault/vault'
import {PasswordLock} from './vault/password-lock'
import {Identity} from './identity'
import {PublicProfile} from './profiles/public-profile'
import {AvatarCreator} from './profiles/avatar-creator'
import {Apps} from './apps/apps'
import {AppRequest} from './apps/request'
import {WorkerQueue} from './utils/worker-queue'
import {IpfsHelper} from './utils/ipfs'
import {PasswordModal} from './ui/password-modal'
import * as IdentityStorage from './storage/identity'
import {Store} from './storage/store'
import {VRHelper} from './3d/vr-helper'
import {Simbol3D} from './3d/index'

let deferredPrompt

window.addEventListener('beforeinstallprompt', (e) => {
	// Prevent Chrome 67 and earlier from automatically showing the prompt
	e.preventDefault()
	// Stash the event so it can be triggered later.
	deferredPrompt = e
	a2hsBtn.classList.toggle('hide')
})

const a2hsBtn = document.querySelector('.add-to-hs__button')
a2hsBtn.addEventListener('click', (e) => {
	a2hsBtn.classList.toggle('hide')
	deferredPrompt.prompt()
	deferredPrompt.userChoice
	.then((choiceResult) => {
		if (choiceResult.outcome === 'accepted') {
			console.log('User accepted the A2HS prompt')
		} else {
			console.log('User dismissed the A2HS prompt')
		}
		deferredPrompt = null
	})
})

const header = document.querySelector('.header')
const logoMain = document.querySelector('.logo--main')
const logoVertical = document.querySelector('.logo--vertical')
const statusEl = document.querySelector('.status')

const registerBtn = document.querySelector('.register')
const loginBtn = document.querySelector('.login')
const logoutBtn = document.querySelector('.logout')
const deleteIdentityBtn = document.querySelector('.delete-identity')

const avatarForm = document.querySelector('.pick-avatar')
const nameForm = document.querySelector('.pick-name')
const avatarCanvas = avatarForm.querySelector('.pick-avatar__canvas')
const avatarFormBtn = avatarForm.querySelector('.pick-avatar__button')
const nameFormBtn = nameForm.querySelector('.pick-name__button')

const identityPickerEl = document.querySelector('.identity-picker')
const identityPickerListEl = identityPickerEl.querySelector('.identity-picker__list')

const profileAvatarEl = document.querySelector('.profile__avatar')
const profileNameEl = document.querySelector('.profile__name')

const settingsEl = document.querySelector('.settings')
const settingsButton = document.querySelector('.settings-button')
const closeSettingsButton = settingsEl.querySelector('.settings__close')

settingsButton.addEventListener('click', () => {
	settingsEl.classList.remove('hide')
})

closeSettingsButton.addEventListener('click', () => {
	settingsEl.classList.add('hide')
})

const vrToggle = document.querySelector('.toggle-wrapper')
const vrButton = vrToggle.querySelector('.toggle-vr')
const vrScene = document.querySelector('.scene')
const canvas = vrScene.querySelector('.canvas')
const vrHelper = new VRHelper()

function setUpVR(session) {
	if (vrHelper.isVRReady()) {
		const simbol3D = new Simbol3D(session, canvas, vrHelper)
		vrToggle.classList.remove('hide')
		
		vrButton.addEventListener('click', (event) => {
			if (event.target.checked) {
				vrHelper.startSession()
					.then(() => {
						simbol3D.room.renderer.vr.enabled = true
						console.log('presenting')
						vrScene.classList.remove('hide')
					})
					.catch(() => {
						vrButton.checked = false
					})
			}
		})
	} else {
		vrToggle.classList.add('hide')
		vrScene.classList.add('hide')
	}
}

const workerQueue = new WorkerQueue()
class SimbolApp {

	constructor() {
		this.session = new Session()
		this.vault = new Vault()
		if (window !== parent) {
			this.apps = new Apps(this.session)
		}
		
		setUpVR(this.session)

		this._registerHandler = this._registerHandler.bind(this)
		this._pickAvatarHandler = this._pickAvatarHandler.bind(this)
		this._pickNameHandler = this._pickNameHandler.bind(this)
		this._authHandler = this._authHandler.bind(this)
		this._identityPickerHandler = this._identityPickerHandler.bind(this)
		this._hideIdentityPickerHandler = this._hideIdentityPickerHandler.bind(this)
		this._logoutHandler = this._logoutHandler.bind(this)
		this._deleteIdentityHandler = this._deleteIdentityHandler.bind(this)
	}

	async init() {
		this.authed = this.session.isAuthed()
		if (!this.apps) {
			this.identityRequest = AppRequest.getRegistrationRequest()
			this.updateSignInBtns()
		}
		try {
			await this.setUpDeviceSecret()
			this.session.setDeviceLock(this.deviceLock)
			this.apps && (this.apps.state = this.authed)
		} catch {
			this.apps && (this.apps.state = false)
		}
		// await workerQueue.ready()

		document.head.querySelector('.protocol-bundle-script').addEventListener('load', (async () => {
			window.IPFS = protocolBundle.IPFS
			window.OrbitDB = protocolBundle.OrbitDB
			window.ipfsCrypto = protocolBundle.Crypto
			window.nacl = protocolBundle.nacl
	
			this.apps && this.apps.init()

			const node = new IPFS({
				repo: 'ipfs',
				pass: this.deviceLock.password,
				EXPERIMENTAL: {
					pubsub: true,
					ipnsPubsub: true,
					dht: true
				},
				config: {
					Addresses: {
						Swarm: ['/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star']
					}
				}
			})
	
			node.once('ready', async () => {
				Store.cleanUpRegistration(this.ipfs)
				console.log('Online status: ', node.isOnline() ? 'online' : 'offline')
				this.orbitDB = await OrbitDB.createInstance(node)
	
				statusEl.classList.toggle('hide')
				registerBtn.disabled = false
				loginBtn.disabled = false
				if (!this.authed) {
					this.addEventHandlers()
				} else {
					const did = this.session.getProfilePublic().did
					workerQueue.postIdleTask(() => {
						return PublicProfile.create(did, this.keychain, this.orbitDB)
					}, this)
						.then((publicProfile) => this.publicProfile = publicProfile)
					workerQueue.postIdleTask((publicProfile) => publicProfile.load())
						.then((publicProfileCache) => {
							this.session.setProfilePublic(publicProfileCache)
							this.reloadProfile(publicProfileCache)
							this._respondRegistrationRequest()
						})
						.catch((e) => {
							console.log(e)
							this._logoutHandler()
						})
				}
			})

			this.ipfs = node
			this.keychain = new Keys(this.ipfs.key, this.session)
			this.identity = new Identity(this.ipfs, this.session, this.keychain)
			IpfsHelper.setIpfs(node)
		}))
	}

	async setUpDeviceSecret() {
		this.passwordLock = new PasswordLock()
		let secret
		if (this.vault.state === 1) {
			secret = await this.vault.getDeviceSecret()
		} else if (this.passwordLock.load()) {
			secret = await this.vault.getDeviceSecret(this.passwordLock)
		} else if (this.passwordLock.exists(this.vault)) {
			if (this.apps) {
				throw 'We need your password to unlock your identity'
			}
			try {
				const modal = new PasswordModal()
				const result = await modal.request()
				this.passwordLock.setPassword(result.password)
				if (result.save) {
					this.passwordLock.save(30 * 24 * 60 * 60 * 1000)
				}
				secret = await this.vault.getDeviceSecret(this.passwordLock)
			} catch (e) {
				console.log(e)
				throw 'We need your password to unlock your identity'
			}
		} else {
			this.vault.createDeviceSecret()
			secret = await this.vault.getDeviceSecret()
		}
		this.deviceLock = new PasswordLock(secret)
	}

	updateSignInBtns() {
		if (this.authed) {
			document.body.classList.add('signed-in')
			document.body.classList.remove('signed-out')
			logoMain.classList.remove('hide')
			logoVertical.classList.add('hide')
			header.classList.remove('header--large')

			logoutBtn.addEventListener('click', this._logoutHandler)
			deleteIdentityBtn.addEventListener('click', this._deleteIdentityHandler)
			
			this.setUpProfile()
			this.reloadProfile()
		} else {
			logoutBtn.removeEventListener('click', this._logoutHandler)
			deleteIdentityBtn.removeEventListener('click', this._deleteIdentityHandler)
			const signInBtns = document.querySelector('.sign-in__buttons')
			signInBtns.classList.remove('hide')

			document.body.classList.remove('signed-in')
			document.body.classList.add('signed-out')
			logoMain.classList.add('hide')
			logoVertical.classList.remove('hide')
			header.classList.add('header--large')
		}
	}

	addEventHandlers() {
		registerBtn.addEventListener('click', this._registerHandler)
		loginBtn.addEventListener('click', this._authHandler)
	}

	removeEventHandlers() {
		registerBtn.removeEventListener('click', this._registerHandler)
		loginBtn.removeEventListener('click', this._authHandler)
		identityPickerListEl.removeEventListener('click', this._identityPickerHandler)
	}

	_registerHandler(event) {
		event.stopPropagation()
		if (this.vault.getState() === 2) {
			this._register()
		} else {
			this._pickPassword()
		}
	}

	_register() {
		const signInBtns = document.querySelector('.sign-in__buttons')
		signInBtns.classList.toggle('hide')
		logoMain.classList.remove('hide')
		logoVertical.classList.add('hide')
		header.classList.remove('header--large')

		avatarForm.classList.toggle('hide')
		avatarFormBtn.addEventListener('click', this._pickAvatarHandler)

		this.avatarCreator = new AvatarCreator(avatarCanvas)
		this.avatarCreator.setModel()
		this.avatarCreator.startEditMode()

		workerQueue.postIdleTask(this.identity.register, this.identity)
		workerQueue.postIdleTask(PublicProfile.create, this, this.keychain, this.orbitDB)
			.then((publicProfile) => this.publicProfile = publicProfile)
	}

	_pickAvatarHandler() {
		workerQueue.postIdleTask((publicProfile, ...parameters) => {
			console.log('heeey', publicProfile)
			return publicProfile.set(...parameters)
		}, this, 'avatar', {avatar: this.avatarCreator.getSource()})

		this.avatarCreator.destroy()
		avatarForm.classList.toggle('hide')
		avatarFormBtn.removeEventListener('click', this._pickAvatarHandler)
		nameForm.classList.toggle('hide')
		nameFormBtn.addEventListener('click', this._pickNameHandler)
	}

	_pickNameHandler() {
		statusEl.textContent = 'Creating a fresh new identity...'
		statusEl.classList.toggle('hide')
		const nameInput = nameForm.querySelector('.pick-name__input')
		workerQueue.postIdleTask((publicProfile, ...parameters) => {
			return publicProfile.set(...parameters)
		}, this, 'displayname', {displayName: nameInput.value}, true)
			.then((publicProfile) => publicProfile.load())
			.then((publicProfileCache) => this.identity.auth(publicProfileCache.did))
			.then((did) => { 
				Store.saveCompleteIdentity(did)
				this.authed = true
				this.updateSignInBtns()
				this._respondRegistrationRequest()

				statusEl.classList.toggle('hide')
				nameForm.classList.toggle('hide')
				nameInput.value = ''
				nameFormBtn.removeEventListener('click', this._pickNameHandler)
			})
			.catch(() => {
				this._logoutHandler()
			})
	}

	async _pickPassword() {
		const passwordModal = new PasswordModal(true)
		try {
			const result = await passwordModal.request()
			const password = result.password
			const savePassword = result.save
			
			const deviceSecret = await this.vault.getDeviceSecret()
			this.passwordLock.setPassword(password)
			const lock = await this.passwordLock.encrypt(deviceSecret)
			this.vault.saveLock('password', lock)
			this.vault.cleanup()
	
			if (savePassword) {
				this.passwordLock.save(30 * 24 * 60 * 60 * 1000)
			}
	
			this._register()
		} catch(e) {
			console.log(e)
		}
	}

	_authHandler() {
		identityPickerListEl.innerHTML = ''
		const dids = localStorage.getItem('dids')
		if (!dids) {
			return
		}
		const identityList = dids.split(',')
		for (const didId of identityList) {
			if (!didId) {
				continue
			}
			const listEl = document.createElement('li')
			listEl.classList.add('.identity-picker__element')
			const profile = IdentityStorage.getPublicProfile(didId)
			listEl.textContent = profile.displayName
			listEl.setAttribute('did', didId)
			identityPickerListEl.appendChild(listEl)
		}
		identityPickerEl.classList.toggle('hide')
	
		identityPickerListEl.addEventListener('click', this._identityPickerHandler)
		document.addEventListener('click', this._hideIdentityPickerHandler)
	
		event.stopPropagation()
	}

	_identityPickerHandler(event) {
		event.stopPropagation()

		const didId = event.target.getAttribute('did')
		this.identity.auth(didId)
		.then(() => {
			this.authed = true
			this.updateSignInBtns()

			this.removeEventHandlers()
			document.removeEventListener('click', this._hideIdentityPickerHandler)
			identityPickerEl.classList.toggle('hide')

			return Promise.resolve()
		})
		.then(() => {
			workerQueue.postIdleTask(() => {
				return PublicProfile.create(didId, this.keychain, this.orbitDB)
			}, this)
				.then((publicProfile) => this.publicProfile = publicProfile)
			workerQueue.postIdleTask((publicProfile) => publicProfile.load())
				.then((publicProfileCache) => {
					this.session.setProfilePublic(publicProfileCache)
					this.reloadProfile(publicProfileCache)
					this._respondRegistrationRequest()
				})
				.catch((e) => {
					console.log(e)
					this._logoutHandler()
				})
		})
	}

	_hideIdentityPickerHandler(event) {
		if (!identityPickerEl.contains(event.target) && !identityPickerEl.classList.contains('hide')) {
			identityPickerEl.classList.toggle('hide')
			identityPickerListEl.removeEventListener('click', this._identityPickerHandler)
			document.removeEventListener('click', this._hideIdentityPickerHandler)
		}
		event.stopPropagation()
	}

	_logoutHandler() {
		this.destroyProfile()
		this.addEventHandlers()
		this.session.delete()
		this.authed = false
		this.updateSignInBtns()
		settingsEl.classList.add('hide')
	}

	setUpProfile() {
		this.avatarCreator = new AvatarCreator(profileAvatarEl)
		window.creator = this.avatarCreator

		const profileNameInputEl = document.querySelector('.profile__name-input')
		const nameEditEl = document.querySelector('.profile__name-edit')
		const profileAvatarInputEl = document.querySelector('.avatar-edit__input')
		const avatarEditTextEl = document.querySelector('.avatar-edit__text')
		const avatarEditIconEl = document.querySelector('.avatar-edit__icon')
		const settingsEl = document.querySelector('.settings-icon')

		this._editNameHandler = this._editNameHandler.bind(this)
		this._editNameEnterHandler = this._editNameEnterHandler.bind(this)
		this._editAvatarHandler = this._editAvatarHandler.bind(this)
		this._editAvatarEnterHandler = this._editAvatarEnterHandler.bind(this)
		this._updateAvatarInput = this._updateAvatarInput.bind(this)

		nameEditEl.addEventListener('click', this._editNameHandler)
		profileNameInputEl.addEventListener('keyup', this._editNameEnterHandler)
		avatarEditTextEl.addEventListener('click', this._editAvatarHandler)
		avatarEditIconEl.addEventListener('click', this._editAvatarHandler)
		profileAvatarInputEl.addEventListener('keyup', this._editAvatarEnterHandler)
		profileAvatarEl.parentElement.addEventListener('click', this._updateAvatarInput)
	}

	destroyProfile() {
		this.avatarCreator && this.avatarCreator.destroy()

		const nameEditEl = document.querySelector('.profile__name-edit')
		const profileNameInputEl = document.querySelector('.profile__name-input')
		const profileAvatarInputEl = document.querySelector('.avatar-edit__input')
		const avatarEditTextEl = document.querySelector('.avatar-edit__text')
		const avatarEditIconEl = document.querySelector('.avatar-edit__icon')

		nameEditEl.removeEventListener('click', this._editNameHandler)
		profileNameInputEl.removeEventListener('keyup', this._editNameEnterHandler)
		avatarEditTextEl.removeEventListener('click', this._editAvatarHandler)
		avatarEditIconEl.removeEventListener('click', this._editAvatarHandler)
		profileAvatarInputEl.removeEventListener('keyup', this._editAvatarEnterHandler)
		profileAvatarEl.parentElement.removeEventListener('click', this._updateAvatarInput)
	}

	reloadProfile(publicProfileCache) {
		publicProfileCache = publicProfileCache || this.session.getProfilePublic()
		if (publicProfileCache) {
			profileNameEl.textContent = publicProfileCache.displayName
			this.avatarCreator && this.avatarCreator.setModel(publicProfileCache.avatar)
		}
	}

	_editNameHandler() {
		const icon = document.querySelector('.profile__name-edit')
		const isSave = icon.classList.contains('icon--check')
		const profileNameInputEl = document.querySelector('.profile__name-input')

		if (isSave) {
			const newName = profileNameInputEl.value.trim().replace(/  +/g, ' ')
			profileNameEl.textContent = newName
			this.publicProfile.set('displayname', {displayName: newName}, true)
			.then((publicProfile) => publicProfile.load())
			.then((publicProfileCache) => this.session.setProfilePublic(publicProfileCache))
			.then(() => this.reloadProfile())
		} else {
			profileNameInputEl.value = profileNameEl.textContent
		}

		icon.classList.toggle('icon--edit')
		icon.classList.toggle('icon--check')
		profileNameInputEl.classList.toggle('hide')
		profileNameEl.classList.toggle('hide')
	}

	_editNameEnterHandler(event) {
		if (event.keyCode === 13) {
			this._editNameHandler()
		}
	}

	_editAvatarHandler() {
		const icon = document.querySelector('.avatar-edit__icon')
		const isSave = icon.classList.contains('icon--check')
		const profileAvatarInputEl = document.querySelector('.avatar-edit__input')
		const avatarEditTextEl = document.querySelector('.avatar-edit__text')

		if (isSave) {
			this.avatarCreator.stopEditMode()
			const newPath = profileAvatarInputEl.value.trim().replace(/  +/g, ' ')
			this.publicProfile.set('avatar', {avatar: newPath}, true)
			.then((publicProfile) => publicProfile.load())
			.then((publicProfileCache) => this.session.setProfilePublic(publicProfileCache))
			.then(() => this.reloadProfile())
		} else {
			this._updateAvatarInput()
			this.avatarCreator.startEditMode()
		}

		icon.classList.toggle('icon--edit')
		icon.classList.toggle('icon--check')
		profileAvatarInputEl.classList.toggle('hide')
		avatarEditTextEl.classList.toggle('hide')
	}

	_editAvatarEnterHandler(event) {
		if (event.keyCode === 13) {
			this._editAvatarHandler()
		}
	}

	_updateAvatarInput() {
		const profileAvatarInputEl = document.querySelector('.avatar-edit__input')
		profileAvatarInputEl.value = this.avatarCreator.getSource()
	}

	_respondRegistrationRequest() {
		if (this.identityRequest) {
			AppRequest.sendAuthenticationResponse(this.identityRequest, this.session)
		}
	}

	async _deleteIdentityHandler() {
		const did = this.session.getProfilePublic().did
		await Store.deleteIdentity(did)
		this._logoutHandler()
	}
}

const simbolApp = new SimbolApp()
simbolApp.init()