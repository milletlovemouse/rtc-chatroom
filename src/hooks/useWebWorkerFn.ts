type Status = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'ERROR'

export default function useWebWorkerFn<T extends (...args: any[]) => any>(fn: T, options?: {
  dependencies?: string[],
  fnDependencies?: Record<string, Function>
}) {
  const { dependencies = [], fnDependencies = {} } = options || {}
  let workerStatus: Status = 'PENDING'
  let worker: Worker & { _url?: string }
  let promise: { reject?: (result: ReturnType<T> | ErrorEvent) => void;resolve?: (result: ReturnType<T>) => void } = {}

  const generateWorker  = () => {
    const blobUrl = createWorkerBlobUrl(fn, dependencies, fnDependencies)
    worker = new Worker(blobUrl)
    worker._url = blobUrl

    worker.onmessage = (e: MessageEvent) => {
      const { resolve = () => {}, reject = () => {} } = promise
      const [status, result] = e.data as [Status, ReturnType<T>]
  
      switch (status) {
        case 'SUCCESS':
          resolve(result)
          workerTerminate(status)
          break
        default:
          reject(result)
          workerTerminate('ERROR')
          break
      }
    }
  
    worker.onerror = (e: ErrorEvent) => {
      const { reject = () => {} } = promise
      e.preventDefault()
      reject(e)
      workerTerminate('ERROR')
    }

    return worker
  }

  const workerTerminate = (status: Status = 'PENDING') => {
    worker.terminate()
    URL.revokeObjectURL(worker._url)
    promise = {}
    worker = null
    workerStatus = status
  }

  const callWorker = (...fnArgs: Parameters<T>) => new Promise<ReturnType<T>>((resolve, reject) => {
    promise = {
      resolve,
      reject,
    }
    worker.postMessage([[...fnArgs]])

    workerStatus = 'RUNNING'
  })

  const workerFn = (...fnArgs: Parameters<T>) => {
    if (workerStatus === 'RUNNING') {
      console.error(
        '[useWebWorkerFn] You can only run one instance of the worker at a time.',
      )
      return Promise.reject()
    }
    worker = generateWorker()
    return callWorker(...fnArgs)
  }

  return {
    workerFn,
    workerTerminate
  }
}

export function createWorkerBlobUrl(fn: Function, deps: string[], fnDepMap: Record<string, Function>) {
  const blobCode = `${depsParser(deps)};onmessage=(${jobRunner})(${fn});${Object.keys(fnDepMap).map(fnName => `${fnDepMap[fnName]};`).join('')}`
  const blob = new Blob([blobCode], { type: 'text/javascript' })
  const url = URL.createObjectURL(blob)
  return url
}

export function depsParser(deps: string[]) {
  if (deps.length === 0)
    return ''

  const depsString = deps.map(dep => `'${dep}'`).toString()
  return `importScripts(${depsString})`
}

export function jobRunner(userFunc: Function) {
  return (e: MessageEvent) => {
    const userFuncArgs = e.data[0]
    return Promise.resolve(userFunc.apply(undefined, userFuncArgs))
      .then((result) => {
        postMessage(['SUCCESS', result])
      })
      .catch((error) => {
        postMessage(['ERROR', error])
      })
  }
}
