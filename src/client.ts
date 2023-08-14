import { createTRPCProxyClient, createWSClient, httpLink, splitLink, wsLink } from "@trpc/client";
import type { AppRouter } from "../../../noteaid/server/routers/_app";

import ws from "ws";

globalThis.WebSocket = ws as any;

const wsClient = createWSClient({
  url: `ws://localhost:3001`,
});

// links and splitLink
const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    splitLink({
      condition(op) {
        console.log(op);
        return true;
      },
      true: wsLink({
        client: wsClient,
      }),
      false: httpLink({
        url: "http://localhost:3001",
      }),
    }),
  ],
});

// wsClient.getConnection().onmessage = (data) => {
//   console.log("in the message", data);
// };

// wsClient.getConnection().onclose = () => {
//   console.info('close')
//   wsClient.close()
// }


async function main() {
  console.log("connection done");
  // const helloResponse = await trpc.hello.query().catch((err) => console.log('error', err));
  // console.log("response from hello endpoint", helloResponse);

  // for (let i = 0; i < 2; i++) {
  //   // await new Promise((resolve) => setTimeout(() => resolve("hey"), 1000));
  //   const helloResponse = await trpc.hello.query().catch((err) => console.log('error', err));
  //   console.log("response from hello endpoint", helloResponse);
  // }

  let counter = 0
  new Promise<void>(async (resolve) => {
    const subId1 = trpc.event.subscribe(0, {
      onStarted(){
        console.log('susbcription started')
      },
      onData(data) {
        console.log(data)
        counter++;
        console.log(counter)
        if(counter > 7){
          subId1.unsubscribe() // unsubscribing the event
          resolve();
        }
      },
      onError(err) {
        console.error('susbcription error', err);
      },
      onComplete() {
        console.log('susbcription ended')
      }
    },)

    // const subId2 = trpc.event.subscribe(1, {
    //   onStarted(){
    //     console.log('connection started')
    //   },
    //   onData(data) {
    //     console.log(data)
    //     counter++;
    //     console.log(counter)
    //     subId1.unsubscribe()
    //     if(counter > 7){
    //       resolve();
    //     }
    //   },
    //   onError(err) {
    //     console.error('error', err);
    //   },
    //   onComplete() {
    //     console.log('complete')
    //   }
    // },)

    // // Test: Cancelling the subscription triggered event before completion.
    // // If the event callback is called on the server, it completes the functionality, except the client does not receive any data
    // await new Promise((resolve) => setTimeout(() => {resolve('hi')}, 2000))
    // subId1.unsubscribe()
  })

  // wsClient.close()
}

await main();