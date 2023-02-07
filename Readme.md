# Simbol Identity Manager

Unfinished prototype of a DID identity manager. The DID protocol is IPFS based, and focuses on managing credentials for avatars that can be carried between virtual worlds. *Doesn't currently run as is*

Running localhost in Windows 10 with a domain:

```bash
openssl req -x509 -out localhost.crt -keyout localhost.key \
  -newkey rsa:2048 -nodes -sha256 \
  -subj '/CN=local.domain.com' -extensions EXT -config <( \
   printf "[dn]\nCN=local.domain.com\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:local.domain.com\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth")
```

save keys in folder above this root
Add `127.0.0.1 local.identity.io` to `C:\Windows\System32\drivers\etc\hosts`
https://www.thewindowsclub.com/manage-trusted-root-certificates-windows

// async function register() {
//   const key = await getKey(Math.random())
//   const keyInstance = await getKeyInstance(key.id)
//    // Figure out how to make eliptic curve keys
//   const didDoc = await generateDidDoc(keyInstance);
//   console.log(didDoc)
//   const initialFiles = await node.files.add(new node.types.Buffer(JSON.stringify(didDoc)))
	
//   const initialHashes = await node.name.publish(initialFiles[0].hash, {key: 'did-key-' + key.id})
//   console.log(initialHashes)
//   const did = generateDid(initialHashes.name)
//   const completedDidDoc = completeDidDoc(didDoc, did)
//   const didDocString = JSON.stringify(completedDidDoc)
//   localStorage.setItem('did-doc-' + key.id, didDocString)

//   const files = await node.files.add(new node.types.Buffer(didDocString))
//   const hashes = await node.name.publish(files[0].hash, {key: 'did-key-' + key.id})
//   return did
// }