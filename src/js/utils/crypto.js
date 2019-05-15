import * as Utils from './utils'

class CryptoHelper {

	static generateId() {
		const arr = CryptoHelper.getRandomNumber(20)
		return Array.from(arr, (num) => {
			return ('0' + num.toString(16)).substr(-2)
		}).join('')
	}

	static getRandomNumber(length = 16) {
		const array = new Uint8Array(length);
		return crypto.getRandomValues(array);
	}

	static async genEncryptionKey(password, salt, mode, length) {
		const algo = {
			name: 'PBKDF2',
			hash: 'SHA-256',
			salt: salt,
			iterations: 10000
		};
		const derived = { name: mode, length: length };
		const encoded = new TextEncoder().encode(password);
		const key = await crypto.subtle.importKey('raw', encoded, { name: 'PBKDF2' }, false, ['deriveKey']);
		
		return crypto.subtle.deriveKey(algo, key, derived, false, ['encrypt', 'decrypt']);
	}

	static async encrypt(text, password) {
		const salt = CryptoHelper.getRandomNumber().buffer
		const algo = {
			name: 'AES-GCM',
			length: 256,
			iv: CryptoHelper.getRandomNumber().buffer
		}
		const key = await CryptoHelper.genEncryptionKey(password, salt, algo.name, algo.length)
		const encoded = new TextEncoder().encode(text)
		
		return {
			cipherText: await crypto.subtle.encrypt(algo, key, encoded),
			iv: algo.iv,
			salt: salt
		}
	}

	static async decrypt(encrypted, password) {
		const algo = {
			name: 'AES-GCM',
			length: 256,
			iv: encrypted.iv
		}
		const key = await CryptoHelper.genEncryptionKey(password, encrypted.salt, algo.name, algo.length)
		const decrypted = await crypto.subtle.decrypt(algo, key, encrypted.cipherText)
		
		return new TextDecoder().decode(decrypted)
	}
	
	static hash(string) {
		return Utils.toBase64(nacl.hash(Utils.stringToBuffer(string)))
	}
	
	static sign(key, string) {
		return new Promise((resolve, reject) => {
			key.sign(Utils.stringToBuffer(string), (error, signature) => {
				if (error) {
					reject(error)
				}
				
				resolve(signature)
			})
		})
	}
	
	static async verify(keyString, signature, string) {
		try {
			const publicKey = await CryptoHelper.importPublicKey(Utils.fromBase64(keyString))
			const isValid = await crypto.subtle.verify(
				{name: 'RSASSA-PKCS1-v1_5'},
				publicKey,
				Utils.fromBase64(signature),
				Utils.stringToBuffer(string)
			)
			return isValid
		} catch (error) {
			throw error
		}
	}

	static importPublicKey(key) {
		return crypto.subtle.importKey(
			'spki',
			key,
			{
				name: 'RSASSA-PKCS1-v1_5',
				hash: {name: 'SHA-256'},
			},
			false,
			['verify']
		)
	}
}

export {CryptoHelper}