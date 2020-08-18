
function deferred() {
    const def = {}
    def.promise = new Promise((resolve, reject) => {
        def.resolve = resolve
        def.reject = reject
    })
    return def
  }
  
  
export default class AsyncQueue {
    constructor(initializer) {
        // This should probably be a linked list but eh
        // implementation details
        this.queue = []
        this.waiting = []
        initializer({
            next: value => {
                if (this.waiting.length > 0) {
                    // If anyone is waiting we'll just send them the value
                    // immediately
                    const consumer = this.waiting.shift()
                    consumer.resolve({
                        done: false,
                        value
                    })
                } else {
                    return this.queue.push({
                        type: 'next',
                        value
                    })
                }
            },
            throw: error => {
                if (this.waiting.length > 0) {
                    const consumer = this.waiting.shift()
                    return consumer.reject(error)
                } else {
                    return this.queue.push({
                        value: error,
                        type: 'error'
                    })
                }
            },
            return: value => {
                if (this.waiting.length > 0) {
                    const consumer = this.waiting.shift()
                    return consumer.resolve({
                        done: true,
                        value
                    })
                } else {
                    return this.queue.push({
                        value,
                        type: 'return'
                    })
                }
            }
        })
    }
  
    next() {
        if (this.queue.length > 1) {
            // If there are items available then simply put them
            // into the queue
            const item = this.queue.shift()
            if (item.type === 'return') {
                return Promise.resolve({
                    done: true,
                    value: item.value
                })
            } else if (item.type === 'error') {
                return Promise.reject(item.value)
            } else {
                return Promise.resolve({
                    done: false,
                    value: item.value
                })
            }
        } else {
            // If there's nothing available then simply
            // give back a Promise immediately for when a value eventually
            // comes in
            const def = deferred()
            this.waiting.push(def)
            return def.promise
        }
    }
  
    [Symbol.asyncIterator]() {
        return this
    }
  }