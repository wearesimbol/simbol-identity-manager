import {CryptoHelper} from '../utils/crypto'

class PasswordLock {

	get type() {
		return 'password'
	}

	constructor(password) {
		this.password = password
	}

	setPassword(password) {
		this.password = password
	}

	async encrypt(secret) {
		const encryptedSecret = await CryptoHelper.encrypt(secret, this.password)
		encryptedSecret.cipherText = new Uint8Array(encryptedSecret.cipherText).toString()
		encryptedSecret.iv = new Uint8Array(encryptedSecret.iv).toString()
		encryptedSecret.salt = new Uint8Array(encryptedSecret.salt).toString()
		return JSON.stringify(encryptedSecret)
	}

	async decrypt(lock) {
		const lockObj = JSON.parse(lock)
		lockObj.cipherText = new Uint8Array(lockObj.cipherText.split(',')).buffer
		lockObj.iv = new Uint8Array(lockObj.iv.split(',')).buffer
		lockObj.salt = new Uint8Array(lockObj.salt.split(',')).buffer
		return CryptoHelper.decrypt(lockObj, this.password)
	}

	save(ttl) {
		localStorage.setItem('vault.passwordcache.password', this.password)
		localStorage.setItem('vault.passwordcache.ttl', Date.now() + ttl)
	}

	load() {
		const ttl = localStorage.getItem('vault.passwordcache.ttl')
		if (ttl && ttl > Date.now()) {
			this.password = localStorage.getItem('vault.passwordcache.password')
			return true
		} else {
			localStorage.removeItem('vault.passwordcache.password')
			localStorage.removeItem('vault.passwordcache.ttl')
			return false
		}
	}

	exists(vault) {
		const lock = vault.getLock(this.type)
		return !!lock
	}
}

export {PasswordLock}