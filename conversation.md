K, so going back to the discussion we had and actually moving on with dev stuff:
Here is what Cursor is giving based on the plan we laid on earlier in the chat, along with some good questions:
What I Understand
The Stakes:
Users are in active conflict zones with unreliable/monitored networks
Location data can expose vulnerable people to violence
Devices can be seized and searched
Misinformation can lead people into danger
Users are stressed, possibly injured, with failing devices
Core Principles:
Safety > Accuracy - Better to have fuzzy, ephemeral data than precise data that endangers people
Local Control - No plaintext to central servers; encryption keys stay with communities
Radical Simplicity - One-tap actions, big icons, minimal text, works under extreme stress
Resilience - Offline-first, degrades gracefully, works on old devices
MVP Priority Features (2-3 sprints):
:white_check_mark: Offline-first (partially done with PGLite)
:x: Encrypted local DB (currently plaintext in IndexedDB)
:x: Pin fuzzing (configurable per map - hide exact coordinates)
:x: Pin TTL auto-expire (critical for removing stale/dangerous info)
:x: One-tap pin presets (:hospital: medical, :droplet: water, :construction: checkpoint, etc.)
:x: Panic wipe (emergency data deletion)
Current Gaps vs. MVP Requirements
The current implementation has serious security vulnerabilities for this use case:
Local database is unencrypted (visible in browser DevTools)
Pins show exact coordinates (not fuzzy)
Pins never expire (dangerous stale data persists)
ElectricSQL syncs to central server in plaintext
No panic wipe mechanism
Complex UI for creating pins (requires map creation first)
Questions Before We Proceed
1. Central Server Architecture:
Should we keep ElectricSQL sync to central Postgres, or go peer-to-peer/mesh for better security?
Or: Keep central server but with end-to-end encryption (server sees encrypted blobs only)?
2. Map Creation Flow:
Should we skip "create map" for the MVP and have pre-configured crisis maps (e.g., "Gaza Safe Points")?
Or allow community-created maps but with verification?
3. Pin Fuzzing Level:
How much fuzzing? (e.g., randomize within 50-500m radius? Grid-based obfuscation?)
Should fuzzing be configurable per map/pin type?
4. Default Pin TTL:
What's a safe default? 6 hours? 24 hours? Configurable per type?
Should checkpoints expire faster (2 hours) than medical facilities (24 hours)?
5. Development Priority:
Should I start with security hardening (encryption, fuzzing, TTL)?
Or UX simplification (one-tap presets, big icons)?
Or both in parallel?
I'm ready to help build this properly and safely. Please advise on the questions above, and I'll create a detailed implementation plan with todos.






9:55
I was thinking
1. I think we can try to keep ElectricSQL for now and then have it set up for peer-to-peer/mesh
2. I think we should have options for both the options for pre-configured crisis maps and allow community-created maps with verification.
3. Hmm, I think pin fuzzing should be configurable per map/pin type
but I don't have an answer for questions 4 and 5


Sam Woodcock
:adhesive_bandage:  6:57 AM
Pretty cool breakdown!
6:57
This project has come on so quickly in a short time:
https://github.com/TanStack/db
6:57
I would fully recommend we use it
6:58
in the short term we store the data as collections, real-time updated from the Electric-SQL sync engines stream
6:59
We have two options for the long term regarding data writes and persistent offline data:
Wait some time for the indexeddb offline backend to be developed for tanstack/db. A proposal was made and it's underway I believe.
Use the rxdb connector to have offline data storage and writes immediately.
7:01
So the goal in my mind would be:
Refactor to integrate tanstack db
Ensure everything works nicely offline to pin locations, then come back online and have it sync / propagate to all users devices
Once we have (1) map creation (2) pin creation and syncing (3) working nicely offline, then we can move on to tackle the optimisations for crisis maps
The first version would cover community mapping only - then v2 would integrate the nice extra features for crisis mapping
7:01
How does that sound?


Omar
  4:00 PM
It seems like the newer stacks are just not doing well with existing architecture, tbh. I'd prefer to just utilize existing, mature stuff in order for us to build something solid. Like, a mesh architecture or peer-to-peer seems pretty good for keeping the data secured. I think I might switch of out electric as well. it seemed to have a lot of issues with setting up and I'm not sure if it's mature enough to handle connections to other systems as much?
So, instead of waiting on proposals for newer tech, we can utilize some older systems that are mature and have a large community behind it. What are some options in that regard?
4:00
In the past, I've been down for mixing it up with the newer tech, but usually not for scaling or security
4:01
Since security and integration is the main concern, I'd like to utilize something that works with a lot of different tech and has been tested thoroughly.
4:01
We're doing something kind of like this at work
4:01
but we have proprietary systems and all that
4:01
But we can utilize the same concepts
4:02
I'm working with some software engineers in a conflict zone and I'd like to test with them as well!


Omar
  4:10 PM
Agreed on the community mapping only and then integrate the nice extra features for crisis mapping
Agreed on everything working nicely offline to pin locations and then sync/propagate
Agree on map creation, then pin creation, and syncing working offline.


Omar
  8:34 PM
Sorry if that was too robotic. Just had lots of programming tasks today and just went through everything like a computer lol


Sam Woodcock
:adhesive_bandage:  4:06 AM
Electric is new sure, but it's used in many production systems - so take that as you will re: mature.
Scaling isn't a concern - this will be primarily client side. We could easily make a tool like this with all server-side software, but the aim is to make something local-first.
Security isn't really a concern at the start either - this is entirely public mapping from users that may or may not be logged in.
The priority order sounds good to me though!
4:07
What mature tech would you suggest that isn't cloud-first, or expensive to run?


Omar
  1:07 PM
Ooh, does it have a fairly decent sized community? That's my only concern since I'm cheating and mostly using Cursor, which is mostly just scraping data from existing forums.
OK, that's a fair point. I wanted to just make sure that security was solid, but I think you're right about it all just being client-side anyway. Ie, nothing on the client is secure, so just make sure to have any data on a secured network and have local first.
1:07
Ok, great on priority.
1:09
I'm actually not sure. Again, I'm cheating by using Cursor and other AI tools to generate a lot of the code and I can't have a gander at how the LLM is developed. However, I am taking that course on LLMs and what they generally all look for, so I think I should also ask them this question.
1:10
Also, thanks for getting back to me. I hope I wasn't offensive with my statements earlier. When I'm busy, I type like a robot and I'm trying to be less like that and more thoughtful.


Sam Woodcock
:adhesive_bandage:  8:56 PM
Not offensive at all! I appreciate brainstorming ideas!
:heart:
1



Sam Woodcock
:adhesive_bandage:  8:56 PM
Why used LLMs though, when it's not working out?

1 reply
21 days agoView thread


Sam Woodcock
:adhesive_bandage:  8:57 PM
Traditional coding works just as well, or better in cases when you are working with new tech :wink:
8:58
As time passes this is closer to being implemented:
https://github.com/TanStack/db/discussions/554
https://github.com/TanStack/db/pull/559
Exciting stuff!
8:59
Fully offline IndexedDB store, incredible performance, and the read-path synced from electric for realtime updates when online
8:59
Once that's ready, we are at a real turning point for the local-first client app experience!


Omar
  9:16 PM
Oh damn, that is pretty exciting. I wonder if I'm able to make multiple builds, since this is going to be an open source application anyway. We can test out different implementations and fall back to different versions based on functionality/need?


Sam Woodcock
:adhesive_bandage:  1:16 AM
For sure, thats an option for prototyping if you have time. In production we would just choose one though