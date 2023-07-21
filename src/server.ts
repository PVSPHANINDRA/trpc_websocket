import {inferAsyncReturnType, initTRPC} from '@trpc/server'
import {createHTTPServer, CreateHTTPContextOptions} from '@trpc/server/adapters/standalone'
import {WebSocketServer} from 'ws'
import {CreateWSSContextFnOptions, applyWSSHandler} from '@trpc/server/adapters/ws'

import { observable } from '@trpc/server/observable'


// handling context
function createContext(opts:CreateHTTPContextOptions | CreateWSSContextFnOptions){
  return {}
}

type Context = inferAsyncReturnType<typeof createContext>

const t = initTRPC.context<Context>().create()

const procedure = t.procedure;
const router = t.router;

const appRouter = router({
  hello: procedure.query(() => {
    return 'Hello'
  }),
  event: procedure.subscription(() =>{
    // return the observable -> this creates an observable stream that will emit data to the subscribed clients
    return observable<{count: number}>((emit) => {
        const intervalId = setInterval(() => {
          // emit is the method used to send the data
          emit.next({count: Math.random()})
        }, 1000)

        // return the function. This is will be triggered when the client unsubscribes
        return () => {
          clearInterval(intervalId)
        }
    })
  })
})

export type AppRouter = typeof appRouter;

// create http server
const {server, listen} = createHTTPServer({
  router: appRouter,
  createContext
})

// create websocket server object
const wss = new WebSocketServer({
  server
})

applyWSSHandler<AppRouter>({
  wss,
  router: appRouter,
  createContext
})

listen(2000)