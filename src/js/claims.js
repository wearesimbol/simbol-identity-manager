import * as Utils from './utils/utils'
import {CryptoHelper} from './utils/crypto'
import {DIDHelper} from './did'

const CLAIM_STRUCTURE = {
	"@context": [
		"https://www.w3.org/2018/credentials/v1"
	],
	"type": ["VerifiableCredential"]
}

const PRESENTATION_STRUCTURE = {
	"@context": [
		"https://www.w3.org/2018/credentials/v1"
	],
	"type": "VerifiablePresentation"
}

class Claims {
	
	static async createClaim(from, to, key, claims) {
		const credential = Object.assign({}, CLAIM_STRUCTURE)
		const time = new Date(Date.now()).toISOString()
		credential.issuanceDate = time
		credential.issuer = from.id
		credential.credentialSubject = {}
		credential.credentialSubject.id = to
		for (const claim of Object.keys(claims)) {
			credential.credentialSubject[claim] = claims[claim]
		}
		
		const keyId = DIDHelper.getKeyIdFromDidDoc(from, key)
		const signedCredential = await Claims.addProof(credential, keyId, key)
		console.log(CLAIM_STRUCTURE)
		return signedCredential
	}
	
	static async addProof(credential, keyId, key) {
		credential = Object.assign({}, credential)
		const time = new Date(Date.now()).toISOString()
		const proof = {
			creator: keyId,
			created: time,
			nonce: CryptoHelper.generateId()
		}
		const tbs = Claims.createVerifyHash(credential, proof)
		const signature = await CryptoHelper.sign(key, tbs)
		const signatureString = Utils.toBase64(signature)
		
		credential.proof = Object.assign(proof, {
			type: 'RsaSignature2018',
			signatureValue: signatureString
		})
		
		return credential
	}
	
	static async verifyClaim(claim) {
		if (typeof claim !== 'object') {
			claim = JSON.parse(claim)
		}
		
		const claimCopy = Object.assign({}, claim)
		const proof = Object.assign({}, claimCopy.proof)
		
		const keyId = proof.creator
		const signature = proof.signatureValue
		const publicKey = await DIDHelper.verifyKeyId(keyId)
		
		delete claimCopy.proof
		
		const tbv = Claims.createVerifyHash(claimCopy, proof)
		const isValid = await CryptoHelper.verify(publicKey, signature, tbv)
		return isValid
	}
	
	static async createPresentation(from, key, claims) {
		const presentation = Object.assign({}, PRESENTATION_STRUCTURE)
		presentation.verifiableCredential = []
		for (const claim of claims) {
			const isValid = await Claims.verifyClaim(claim)
			if (isValid) {
				presentation.verifiableCredential.push(claim)
			} else {
				console.log('throwing', isValid)
				throw `Claim invalid: ${JSON.stringify(claim)}`
			}
		}
		
		const keyId = DIDHelper.getKeyIdFromDidDoc(from, key)
		const signedPresentation = await Claims.addProof(presentation, keyId, key)
		return signedPresentation
	}
	
	static createVerifyHash(document, options) {
		delete options.type
		delete options.id
		delete options.signatureValue
		options = Utils.sortObjectProperties(options)
		const optionsString = JSON.stringify(options)

		document = Utils.sortObjectProperties(document)
		const documentString = JSON.stringify(document)
		const hashedOptionsString = CryptoHelper.hash(optionsString)
		const hashedDocument = CryptoHelper.hash(documentString)
		return hashedOptionsString + hashedDocument
	}
}

export {Claims};