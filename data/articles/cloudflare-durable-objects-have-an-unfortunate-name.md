---
title: Cloudflare Durable Objects have an unfortunate name
published: 2021-08-18T22:47:03
tags: cloudflare, serverless, code
---

I've been researching serverless architectures because I don't want to get caught in a situation where something happens at 3am and I end up disappointing a bunch of people with my bad server admin skills. There's a bunch of options right now but the one that has my attention is [Cloudflare Workers](https://developers.cloudflare.com/workers/) because of their capability of deploying serverless functions "at the edge", that is, closest to customers. This might come in handy later when the Internet inevitably fractures into per-country sub-internets that each have their own rules and laws and whatnots.

What had been holding me back is that I didn't quite understand the difference between their key-value store, [KV](https://developers.cloudflare.com/workers/runtime-apis/kv), and a recently new product called [Durable Objects](https://developers.cloudflare.com/workers/runtime-apis/durable-objects). I think it's a case of unfortunate naming but when Durable Objects came out I asked myself, "if these are Durable Objects, does that mean data in KV is less durable? Is there some difference in data availability?"

These questions sent me down rabbit holes of confusion because nobody was answering them, but today I finally realized that I was completely misunderstanding Durable Objects. What they should have actually been called is _Addressable Workers_.

When you're running "normal" serverless functions, your workers need to be stateless because there could be many different server processes or entirely different machines around the world running your code. Durable Objects turns this idea on its head and instead allows you to register workers that are addressable by a unique ID. As long as you have the unique ID, you're guaranteed to be talking to the same worker regardless of where in the world the different clients that are trying to talk to this worker are. As a result, this worker can keep parts of its state in memory and your clients will see the same data.

Another really cool thing about Durable Objects is that you can instantiate a web socket with it so that clients can send and receive messages from this worker in realtime.

Now I can't stop thinking about how to tweak the projects I have in the works to try take advantage of this technology. I'm glad I kept digging instead of stopping at the name.
