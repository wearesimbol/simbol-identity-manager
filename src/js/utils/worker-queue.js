import {default as TaskQueue} from 'task-worklet'

const queue = new TaskQueue({size: 2})
const isReady = queue.addModule('dist/workers/task-worker.js')

class WorkerQueue {
	
	constructor() {
		this.idleQueue = []
		this.queue = queue
		this.isReady = false
		this.runLoop = this.runLoop.bind(this)
		this.ready()
	}
	
	async ready() {
		await isReady
		this.isReady = true
		return this.isReady
	}
	
	postTask(...parameters) {
		return this.queue.postTask(...parameters)
	}
	
	async postIdleTask(func, context, ...parameters) {
		return new Promise((resolve, reject) => {
			this.idleQueue.push({
				func,
				context,
				parameters: [...parameters],
				callback: (err, result) => {
					if (err) {
						reject(err)
					}
					resolve(result)
				}
			})
			
			if (!this.taskHandle) {
				this.taskHandle = requestIdleCallback(this.runLoop, {timeout: 1000})
			}
		})
	}
	
	async runLoop(deadline) {
		while ((deadline.timeRemaining() > 0 || deadline.didTimeout) && this.idleQueue.length) {
			const task = this.idleQueue.shift()
			
			if (this._lastReturnedValue) {
				task.parameters.unshift(this._lastReturnedValue)
			}
			const resultPromise = task.func.call(task.context, ...task.parameters)
			await Promise.resolve(resultPromise)
			.then((result) => {
				task.callback(null, result)
				this._lastReturnedValue = result
			})
			.catch((error) => {
				task.callback(error)
			})
		}
		
		if (this.idleQueue.length) {
			this.taskHandle = requestIdleCallback(this.runLoop, { timeout: 1000} );
		} else {
			this.taskHandle = 0;
		}
	}
}

export {WorkerQueue}