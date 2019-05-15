const polyfillConfig = {
	input: 'libs/polyfills.js',
	output: [{
		file: 'dist/polyfills.js',
		format: 'iife'
	}]
}

export default [polyfillConfig]