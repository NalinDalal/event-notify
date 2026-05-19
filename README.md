# event-notify

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.3.11. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

----


Mini Real-Time Notification Service
Objective
Ek simple backend system bnao jisme users authentication ke through login/register kar saken aur apne notifications manage kar saken.
System me jab bhi koi new notification create ho, toh woh instantly connected users ko real-time me receive ho jaye using WebSockets/Socket.io.

Example:
User login karta hai
Admin ya koi API new notification create karti hai
Notification DB me save hota hai
Saath hi socket event ke through instantly client ko push ho jata hai

-----
tables: 

model user{
    email String  @unique
    pwd String 
    role Role @default(USER) 

    notification Notification[]
}

enum Role{
    USER
    ADMIN
}

//notification management: list notifications,
//open a notification: show head, body
//when opened, switch the status to read via a boolean

model notification{
body string
isRead Boolean @default(false) 


}

------------

docker run --name pg-dev \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=mydb \
  -p 5432:5432 \
  -d postgres:16

----------

push till evening, deploy on render nd push the code to founder

-----

curl -X POST http://localhost:3000/signup \
                           -H "Content-Type: application/json" \
                           -d '{"email":"nalin@demo.com","pass":"pass123","role":"USER"}'
{"message":"User created","user":{"id":"cmpayuxbd0000i1rgnj9i4t50","email":"nalin@demo.com","pwd":"$2b$10$DEIN1cIF6a86NiMEM7NxSuqB5213QS3httR5uD1xOMQ/hpDYuHRbi","role":"USER","createdAt":"2026-05-18T08:53:00.073Z","updatedAt":"2026-05-18T08:53:00.073Z"}}⏎

----

curl -X POST http://localhost:3000/login \
                           -H "Content-Type: application/json" \
                           -d '{"email":"nalin@demo.com","pass":"pass123"}'
{"message":"Login successful","token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtcGF5dXhiZDAwMDBpMXJnbmo5aTR0NTAiLCJpYXQiOjE3NzkwOTQ5MTcsImV4cCI6MTc3OTY5OTcxN30.iPoxYAygU7_oMHb9j7pMDzBSPBkQIuZTQBsAMrNuJqw"}⏎

---

Authentication endpoint done

---

everything done
