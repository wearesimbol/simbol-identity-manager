import * as Utils from 'utils.js'
import {Session} from 'session.js'

const resolveDidInput = document.querySelector('.resolve-did__input')
const resolveDidTextarea = document.querySelector('.resolve-did__textarea')

function prettyDidDoc(didDoc) {
	 return JSON.stringify(didDoc, null, 2) 
}

resolveDidInput.addEventListener('keypress', (event) => {
	if (event.key === 'Enter') {
		event.preventDefault()
		event.stopPropagation()
		Utils.resolveDidDoc(resolveDidInput.value)
			.then((didDoc) => {
				console.log(didDoc)
				resolveDidTextarea.value = prettyDidDoc(didDoc)
				return false
			})
	}
})

async function verifyClaim(claim) {
	const isValid = await Claims.verifyClaim(claim)
	return isValid
}

const didEl = document.querySelector('.did')
const didDocEl = document.querySelector('.did-doc')
const claimsDocEl = document.querySelector('.claims-doc')

loadPublicProfile().then((claimsDoc) => {
	claimsDocEl.textContent = prettyDidDoc(claimsDoc)
})

const session = new Session()
const didDoc = session.loadDidDoc()
didEl.textContent = didDoc.id
didDocEl.textContent = prettyDidDoc(didDoc)