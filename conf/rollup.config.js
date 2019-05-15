import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import serve from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'

const plugins = [
	resolve({
		preferBuiltins: false,
		browser: true
	}),
	commonjs({
		ignoreGlobal: true
	})
]

if (process.env.WATCH) {
	plugins.push(
		serve({
			contentBase: '',
			port: 8080,
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET'
			}
		}),
		livereload({
			watch: 'dist',
			verbose: true
		})
	)
}

const simbolConfig = {
	input: 'src/js/index.js',
	output: [{
		file: 'dist/index.js',
		format: 'es'
	}],
	plugins
}

export default [simbolConfig]