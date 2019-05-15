class Session {
  
	constructor(deviceLock) {
		this.setDeviceLock(deviceLock)
	}

	isAuthed() {
		return this.hasKey() && this.hasDidDoc()
	}

	delete() {
		this.removeKey()
		this.removeDidDoc()
		this.removeProfilePublic()
	}
	
	hasKey() {
		return !!this._getKeyString()
	}

	_getKeyString() {
		return localStorage.getItem('session.key')
	}

	async getKey() {
		if (!this.deviceLock) {
			throw 'Lock needed to encrypt and decrypt key locally'
		}
		const key = this._getKeyString()
		return await this.deviceLock.decrypt(key)
	}

	async setKey(key) {
		if (!this.deviceLock) {
			throw 'Lock needed to encrypt and decrypt key locally'
		}

		const encryptedKey = await this.deviceLock.encrypt(key)
		localStorage.setItem('session.key', encryptedKey)
	}

	removeKey() {
		localStorage.removeItem('session.key')
	}
 	
	hasDidDoc() {
		return !!this.getDidDocString()
	}

	getDidDocString() {
		return localStorage.getItem('session.did-doc')
	}
	
	getDidDoc() {
		const didDoc = this.getDidDocString()
		return JSON.parse(didDoc)
	}

	setDidDoc(didDoc) {
		localStorage.setItem('session.did-doc', JSON.stringify(didDoc))
	}

	removeDidDoc() {
		localStorage.removeItem('session.did-doc')
	}

	hasProfilePublic() {
		return !!this.getProfilePublicString()
	}

	getProfilePublicString() {
		return localStorage.getItem(`session.profile.public`)
	}

	getProfilePublic() {
		const profilePublic = this.getProfilePublicString()
		return JSON.parse(profilePublic)
	}

	setProfilePublic(profilePublic) {
		localStorage.setItem('session.profile.public', JSON.stringify(profilePublic))
	}

	removeProfilePublic() {
		localStorage.removeItem('session.profile.public')
	}

	getDeviceLock() {
		return this.deviceLock
	}

	setDeviceLock(deviceLock) {
		this.deviceLock = deviceLock
	}
}
  
export {Session}