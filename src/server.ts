import {TRPCError, inferAsyncReturnType, initTRPC} from '@trpc/server'
import {createHTTPServer, CreateHTTPContextOptions} from '@trpc/server/adapters/standalone'
import {WebSocketServer} from 'ws'
import {CreateWSSContextFnOptions, applyWSSHandler} from '@trpc/server/adapters/ws'

import { observable } from '@trpc/server/observable'
import {z} from 'zod';

// handling context
function createContext(opts:CreateHTTPContextOptions | CreateWSSContextFnOptions){
  return {}
}

type Context = inferAsyncReturnType<typeof createContext>

let x = {'a': 1, 'b': 2} // TEST: how global variable is updating
const t = initTRPC.context<Context>().create()

const procedure = t.procedure;
const router = t.router;

const appRouter = router({
  hello: procedure.query((opts) => {
    console.log('hello query')
    // // Test: when error is thrown, does the websocket still on. Answer: the websocket is stil on. Even we throw some error.
    // throw new TRPCError({
    //   code: 'UNAUTHORIZED',
    //   message: 'You are not authorized to send messages to this session',
    // });
    // // return 'hello'
  }),
  event: procedure.input(z.number()).subscription((opts) =>{
    const input = opts.input
    // // Test:
    // // from the above it is clear that, even though we throw error, the websocket connection still persists. What about error on the initial sub req?
    // // Answer: any error during the initial subscription request, will not start the subscription. 
    // if(!input){
    //   throw new TRPCError({
    //     code: 'FORBIDDEN',
    //     message:'he'
    //   })
    // }
    // return the observable -> this creates an observable stream that will emit data to the subscribed clients
    return observable<{count: number, x: number}, {code: string, message: 'hgey'}>((emit) => {
 
      const intervalId = setInterval(async () => {
        // emit is the method used to send the data
        const random = Math.random()
        if(input){
          x['a'] +=1
        }
        else{
          x['a'] -=1
        }
        // // Test:
        // // from the above it is clear that, even though we throw error, the websocket connection still persists. What about subscription?
        // // Answer: Any error after subsctiption starts, subscription will be closed. NOTE: any error during the initial subscription request, will not start the subscription. 
        // if(!input){
        //   throw new TRPCError({
        //     code: 'FORBIDDEN',
        //     message:'he'
        //   })
        // }
        // await new Promise((resolve) => setTimeout(() => {resolve('hi')}, 5000)) // TEST: client unsubscribe before completion of this callback function
        const data = {count: random, x: input}
        console.log(input, data)
        emit.next(data)
        // console.log('data send to the client')
      }, 1000)
      // return the function. This is will be triggered when the client unsubscribes
      return () => {
        console.info('subscriptuon ended')
        clearInterval(intervalId)
      }
    })
  })
})

export type AppRouter = typeof appRouter;

// create http server
const {server, listen} = createHTTPServer({
  router: appRouter,
  createContext,
})

// create websocket server object
const wss = new WebSocketServer({
  server
})

const handler= applyWSSHandler<AppRouter>({
  wss,
  router: appRouter
})

wss.on('connection', (ws, req) => {
  ws['x-header1'] = 'header_1' // adding custom header 
  ws.ping('hey') // pinging the client. and checking onpong is triggered or not
  console.log('in the connection')
  console.log(`➕➕ Connection (${wss.clients.size})`);
  ws.on('pong', () => {
    console.log('pong')
  })
  ws.once('close', () => {
    console.log(`➖➖ Connection (${wss.clients.size})`);
  });
  // TEST: termianting the websocket, does client stop connecting to the server?
  // Ans: Since subscriptions are meant to reconnect, if the client side, does not close the websocket from their end. The subscription event, tries to reconnect.
  // To avoid this scenario, add the websocket close functionality on the client side. 
  // setTimeout(() => ws.terminate(), 2000) // does terminating the client closing the subscription or not
});

wss.on('headers', (ws, header, req)=> {
  console.log('in the headers')
  // To see the follow of event in websocket. --> events --> headers, connection
  // throw new TRPCError({
  //     code: 'FORBIDDEN',
  //     message:'he'
  //   })
})

console.log('✅ WebSocket Server listening on ws://localhost:2000');
process.on('SIGTERM', () => {
  console.log('SIGTERM');
  handler.broadcastReconnectNotification();
  wss.close();
});

listen(3001)