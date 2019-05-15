import * as Utils from './utils/utils.js'

class DIDHelper {

  static generateDid(id) {
    return `did:ipid:${id}`
  }
  
  static generateDidDoc(key) {
    const time = new Date(Date.now())
    const didDoc = {
      "@context": {
        "/": "zdpuAmoZixxJjvosviGeYcqduzDhSwGV2bL6ZTTXo1hbEJHfq"
      },
      "created": time.toISOString(),
      "publicKey": [
        {
          "publicKeyPem": `${Utils.toBase64(key.public.marshal())}`,
          "type": "RsaVerificationKey2018"
        }
      ],
      "updated": time.toISOString()
    }
    
    return didDoc
  }
  
  static completeDidDoc(didDoc, did) {
    didDoc.id = did
    didDoc.publicKey = didDoc.publicKey.map((publicKey, i) => {
      publicKey.id = `${did}#keys-${i + 1}`
      publicKey.controller = did
      return publicKey
    })
    const time = new Date(Date.now())
    didDoc.updated = time.toISOString()
    
    return didDoc
  }

  static getKeyIdFromDidDoc(didDoc, key) {
		for (const keyInfo of didDoc.publicKey) {
			const publicKey = Utils.toBase64(key.public.marshal())
			if (keyInfo.publicKeyPem === publicKey) {
				return keyInfo.id
			}
		}
		throw 'Key not available in Did Document'
	}
	
	static async verifyKeyId(keyId) {
		const did = keyId.substring(0, keyId.indexOf('#'))
		const didMethod = did.substring(did.indexOf(':') + 1, did.lastIndexOf(':'))
		switch (didMethod) {
			case 'ipid':
				const didDoc = await Utils.resolveDidDoc(did, true)
				const ldKey = didDoc.publicKey.reduce((returnValue, key) => {
					if (returnValue) {
						return returnValue
					}
					
					if (key.id === keyId) {
						return key
					}
					
					return
				}, undefined)
				if (ldKey.controller !== didDoc.id) {
					throw 'Key is not controlled by the Identity'
				}
				return ldKey.publicKeyPem
			default:
			throw 'Can\'t resolve DID'
		}
	}
}

export {DIDHelper}
