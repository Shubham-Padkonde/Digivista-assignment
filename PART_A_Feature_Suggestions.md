# Part A: Two feature suggestions for Coy

## How I looked at the product, and what I could not see

I reviewed Coy from its public surfaces: the landing page at getcoy.com (hero, "How it works", the privacy promises, the pricing block with the invite-for-a-free-slot option, and the FAQ) and the first screen of app.getcoy.com, which asks for a phone number with a +91 prefix, an optional "Have an invite code?" field and an 18+ consent checkbox before "Send code".

I did not get past that screen. The phone OTP, adding a crush, email verification, the invite link flow after login and the extra-slots screen sit behind a login that needs a personal phone number and email. So everything labelled **Observed** below comes from the public pages, and everything labelled **Assumption** is my inference about screens I have not seen. Where an assumption matters to the proposal I say how to check it. Before submitting I will walk the logged-in flow and add anything that contradicts what I have written here.

### What the public pages say (observed)

- You add up to 5 people you know, by phone number, email or both. Only you can see your list.
- The first 3 crushes are free. More slots are sold once, at launch prices of ₹49 (+1), ₹129 (+3) and ₹199 (+5). Inviting 3 friends who join and add a crush earns one free slot.
- The person you add gets one anonymous message on WhatsApp, SMS or email ("someone has a crush on you"), at most one per week and 3 in total, each with a stop link.
- "Adding is final. Nobody can add and remove names to test who likes them."
- "We never say who. Not directly, and not through counts that would let someone work it out."
- On a mutual add, both people see the match "and how to reach each other"; the landing page mock-up shows a "Say hi on WhatsApp" button.
- There are no profiles, photos, swiping or chat. Numbers and emails are matched as keyed hashes and stored encrypted.

Two of these shape both proposals. Adding is irreversible and slot-limited, so a single mistake is expensive. And the product's trust depends on never leaking directional information, including through counts.

---

## Feature 1: Confirm-before-commit when adding a crush

### Problem observed

A crush is added by typing a phone number or email, and the public pages state that adding is final and that slots are scarce: 5 at most, 3 free, the rest paid. A mistyped digit therefore has three costs at once. A free slot is burned. A paid slot is burned. And, if the typo happens to be a real person's number, a stranger receives a message saying someone has a crush on them. None of these can be undone by the user, by design.

**Assumption:** I could not see the add-crush screen, so I do not know whether it already shows a confirmation step. If it already does, this proposal reduces to the undo window and the "wrong person" safeguard described below.

### Proposed feature

Split "add" into two steps:

1. **Review step.** Before anything is committed, show what will happen: the number or email as typed, with the country code made explicit, and a plain statement such as "This uses 1 of your 3 free slots and cannot be undone." Nothing is sent and no slot is used yet.
2. **Short grace period after confirming.** After the user taps "Add", hold the crush in a pending state for a fixed, short window (for example 2 minutes) before the heads-up message is sent and the slot is spent. During that window the user can cancel. After the window it becomes final, exactly as the product promises today.

The grace period must be a fixed delay for everyone and must not be extendable or repeatable for the same contact, otherwise it becomes a way to add and remove names to test reactions.

### Why it is required

Irreversibility is the right rule for the privacy model, but it should not be paired with an input method that is easy to get wrong. Phone numbers are long and mobile keyboards are small. Today's design makes the user's own typing error the most likely way to waste a paid slot, and the most likely way for a stranger to get an unexplained message from Coy, which is a trust and complaint risk for a product whose messages are sent on the user's behalf. A short confirmation and a short grace window remove most of that cost without weakening the "no add and remove probing" guarantee.

### Rough acceptance test

- Given a signed-in user with 3 free slots, when they enter a number and reach the review step, then the slot count is unchanged and no message is queued.
- When they confirm, then the crush appears in their list as "pending", a slot is reserved but not yet marked used, and no outbound message is queued yet.
- When they cancel inside the window, then the slot is returned and no message was ever queued.
- When the window passes without cancellation, then the slot is spent, the heads-up is queued exactly once, and the entry can no longer be removed.
- When the same user tries to cancel and re-add the same contact more than once, then the second attempt is refused with a neutral message (for example "this contact was already added"), so cancel and re-add cannot be used to probe.
- The review screen, the pending state and the error messages are identical whether or not the number belongs to an existing Coy user.

### Privacy implications

- The review step must not look the number up. If it said "this person is on Coy" or "not on Coy", it would leak account existence, which is itself information about the person. The confirmation is purely a display of what the user typed.
- The pending state is visible only to the adder. The recipient is not told anything until the window closes.
- The cancel path must not feed information back. A refused re-add reveals nothing about the other person, only about the user's own history.
- Stored pending entries should use the same keyed-hash handling as committed ones, so a pending add is no easier to read than a final one.

---

## Feature 2: Match handover that the user controls

### Problem observed

The landing page promises that on a match "you both see the match and how to reach each other", and its mock-up shows a "Say hi on WhatsApp" action. That is the moment the whole product exists for, and it is also the moment where the privacy guarantee stops: from here two people hold each other's identity.

**Assumption:** I do not know what contact detail the real match screen releases or whether users can choose. I only know it is meant to give "how to reach each other". If both people were added by phone number and one was added only by email, the default channel is also unclear to me.

The risk I am responding to is that the app decides what is shared at the instant of the match. A user may have added someone by email and not want their personal phone number released, or may prefer Instagram or a work email to WhatsApp. The user is also in an exposed, emotional moment and has had no chance to think about it.

### Proposed feature

Let each user choose, ahead of time and in settings, which single reach-me channel is released if a match ever happens (for example WhatsApp number, a different phone number, an email address, or "I will reach out in the app" if a basic in-app option exists). The choice is stored privately and defaults to the least revealing option the product already offers, not to the most.

At the moment of a mutual match:

- Each person sees only the channel the other person pre-selected.
- A short, optional, pre-written opener (for example "Hi, it's you!") is offered but never sent automatically.
- Either side can decline to reveal ("Not ready to share") and still see that the match exists, and the other side is told only that the match is waiting for them to share. They are not told that it was declined.

### Why it is required

A match is the point where the product converts anonymity into disclosure. Making disclosure automatic, and using whatever contact the user happened to be added with, turns a consent-sensitive moment into a default. Giving the user a pre-chosen, minimal channel lets a hesitant user participate at all (many people will not add a crush if it means exposing a personal number). Better participation also helps the product directly: more adds, more matches, and more reasons to buy slots or invite friends.

### Rough acceptance test

- Given user A chose "email" and user B chose "WhatsApp" as reach-me channels, when A and B add each other, then A sees B's WhatsApp contact and B sees A's email, and neither sees any other detail.
- Given A has not set a channel, then the default shown is the least revealing option, not the number they signed up with.
- Given B is set to "Not ready to share", then A sees a neutral "match waiting" state that is identical to the state shown when B has simply not opened the app yet.
- Given only one side has added the other, then no channel is shown to anyone, in any API response or notification.
- The release happens only when the server confirms a mutual add. A client that tampers with a match id receives a generic not-found.

### Privacy implications

- The contact channel is a new piece of sensitive data and must be stored encrypted like the numbers and emails already are, and released only through the server-side mutual check.
- The "declined to share" state must be indistinguishable from "not yet seen". If it differs, one side can tell that the other saw the match and chose to withhold, which reveals more than the product intends.
- Changing the channel after a match should not retroactively change what an existing match already saw.
- The preference screen should say plainly who sees the channel and when, in the same words used on the landing page: only after both people add each other.

---

## Notes for the reviewer

I chose these two because they sit at the two ends of the user's relationship with the product's privacy rule: the first stops the user from damaging themselves or a stranger before anything is sent, and the second stops the match from over-disclosing once it happens. Both keep the core promise intact: neither adds a way to learn that someone likes you before you have also added them.

I have deliberately not proposed anything that shows counts, "someone near you" signals, or a way to peek at incoming interest. The landing page rules this out ("not through counts that would let someone work it out"), and Part B follows the same rule: the swipe feed and its API never carry incoming-like information.
