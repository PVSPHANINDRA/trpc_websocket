import {createTRPCProxyClient, createWSClient, httpLink, splitLink, wsLink} from '@trpc/client'
import type {AppRouter} from './server'

import ws from 'ws';

globalThis.WebSocket = ws as any;

const wsClient = createWSClient({
  url: `ws://localhost:2000`
})

// links and splitLink
const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    splitLink({
      condition(op){
        return op.type === 'subscription'
      },
      true: wsLink({
        client: wsClient
      }),
      false: httpLink({
        url: 'http://localhost:2000'
      })
    })
  ]
})



async function main(){
  const helloResponse = await trpc.hello.query()
  console.log('response from hello endpoint', helloResponse)
 
  let counter = 0
  await new Promise<void>((resolve) => {
    const subId = trpc.event.subscribe(undefined, {
      onData(data) {
        console.log(data)
        counter++;
        console.log(counter)
        if(counter > 3){
          subId.unsubscribe();
          resolve();
        }
      },
      onError(err) {
        console.error('error', err);
      },
    })
  })

  wsClient.close()

}

await main()

console.log('done')