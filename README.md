# ShowMe

Collaboratively pin locations on a map.

## Getting Started

1. **Start the stack**
```bash
make up
```

Application should run locally at `http://localhost:3012`

## Simple By Design

Creating a project:
- Users create a group / map for a specific purpose.
- Users share a link to the map with their community.
- Sign in is not required, data is anonymous.
- Each 'map' is unique to a group, with no information sharing
  across maps.
- In future, maps could be optionally made private, for sensitive data
  (I'm sure users will request this).

Sharing locations:
- A pin can be placed, or users geolocation used.
- User adds optional tags and a description of what is there.
- It would probably be useful to allow adding photos too.

Browsing the map:
- Users see locations being added in real-time.
- The tag / icon might be enough information they need.
- Clicking the map icon opens up further details from the user that posted.

### How It Works

A web app (easy access, lightweight), with two core components:
- Postgres database on server.
- Map client with PGLite (local Postgres), likely built in TS Svelte.

Sync engine:
- Using `electric-sql` as a sync layer, data is synced between the
  central Postgres server and users PGLite instance.
- Users receive real-time updates as locations are added.

Offline:
- As data is stored in local PGLite and synced when online, data
  can be read / written while offline.

Web map:
- MapLibre points, with clustering if required on large projects.

### Notifications

- An extra value add, to come later.
- Users can add an email address, signal username, telegram username, etc.
- They can be notified of new events, based on filters, to whatever service
  they specific.

#### Email

- Simple, SMTP server, send to user.

#### Signal

- https://github.com/bbernhard/signal-cli-rest-api
- Send a message directly to user via Signal protocol.

#### Telegram

- Has a 'Bot API': https://core.telegram.org/bots/api for sending
  messages.

#### SMS

- Probably more complex, but may consider it.

#### Other?

- Other methods as requested.
