# Peer Playtest Notes: The Robner Case

I played the browser version (`master` @ `6e2dc65`, run locally with `npm run dev`) on November 5 for about 40 minutes, on my own, so you weren't watching. English isn't my first language and I'd never played a parser-style text adventure before, so I kept Chrome's translation on to read the Chinese alongside the English. I still typed every command in English. I also had a couple of hints partway through: how the interview commands work, and "try inspect/search on things the room description mentions." Part of my progress after that wasn't fully on my own.

- **Goal:** Find out how Marshall Robner really died and accuse the right person or people. The opening and the suspect cards made this clear right away, and I liked starting with "it looks like suicide, but you're not convinced." Not knowing the rules of this kind of game, though, I wasn't sure *how* I was supposed to make progress, and I accused George very early just to see what would happen. When I chose "Continue investigating," I didn't realize the accusation would stay on the record until the end.

- **Actions and feedback:** This was where I struggled most.
  - **The run ended at a limit I couldn't see.** My screen said 61 / 75 actions, so I thought I had 14 left. Then the case ended with "model call limit." It had counted my 39 rejected commands too. The README says a wrong command "will not advance the case," and the game wants you to guess, so I guessed freely, thinking rejections were free. Seeing the word "model" also made me wonder whether an AI had somehow been connected.
  
    ![image-20261105155720542](assets/image-20261105155720542.png)
  
  - **Copying names from the page didn't work.** The Rooms panel shows "Library," "Kitchen," "Garden," "Living Room," so I typed or pasted exactly that, and was rejected at least seven times. The error message then lists the rooms in lowercase ("There is no Library in this house. The rooms are: living room, library…"), which felt strange: what I copied from the screen was exactly what failed. For evidence I always copied from the Evidence panel, and that worked because the panel shows the exact spelling. Afterwards I checked the engine to understand the pattern, and the rules differ by command:
  
    | What you type | Capitalization rule | Example |
    |---|---|---|
    | Suspect names | any case, plus full names and titles | `interview privately leslie robner` works |
    | Rooms | lowercase only, but the panel shows Title Case | `go to Library` fails |
    | Things in a room | exact spelling | `inspect Body` fails; `inspect ebullion` fails before you have it |
    | Found evidence with `inspect` / `compare` | any case | `inspect loblo` works |
    | Found evidence with `show` | exact spelling | `show Dunbar loblo` fails |
    | `ask` topics | exact spelling | `ask Baxter about Concert` fails, `concert` works; `LoBlo` works, `loblo` fails |
    | Singular/plural | exact | `search hole` fails, `search holes` works |
  
    So the Rooms panel is the one place where copying the screen breaks. Elsewhere you have to guess whether a given command cares about case.
  
  - **Refusals didn't tell me which way to adjust.** In my private interview with George, everything I tried got "The person, topic, or scene does not match this action," and I had no idea what kind of thing to try next.
    - `search bookcase` failed until I had inspected the bookcase, but the message was the same generic "prerequisites are missing," so I assumed the bookcase couldn't be searched at all.
    - `show Baxter letter` told me to "find the evidence and be with the person," but I had the letter and Baxter was right there.
    - I also only found out by trial and error that you `show` evidence but `ask` about topics.
    
  - **Some things the description mentions can't be used.** The Garden description starts with rows of roses, but `inspect roses` and `inspect rose` were both rejected. The same happened with `plates` in the Kitchen. `read papers` worked, but `read will` didn't.
  
- **Progress/Dynamics:**
  - I spent the first 20 actions in the Living Room: interviews, the letter, the concert ticket and LoBlo.
  - After the hint I went room by room. In the Library I found the bookcase, the safe, the Focus papers and the will. Then I did the china count in the Kitchen, and the holes, ladder and fragment in the Garden.
  - Back with the suspects, I compared the chemical with both medicines and showed Dunbar the fragment.
  - My theory by the end was George and Baxter together, because the new will gave George such an obvious motive.
  - I lost a lot of actions repeating myself. I searched Mrs. Robner three times because I'd forgotten which suspect each medicine came from. The Evidence panel just says "LoBlo" and "Allergone" with no owner, and "Recent actions" only keeps the last seven entries, so earlier answers had scrolled away.
  - I also thought I had to interview someone before comparing their medicine, which cost an extra interview and return each time.

- **Experience/Aesthetic:**
  - **The best moment was the lab comparison.** Allergone came back "no match," then LoBlo matched, with a clear explanation of how it mixes with Ebullion. Even though I'd wasted some commands going back to check which medicine was whose, it really felt like cracking the case.
  - **The Garden chain felt great too.** The holes, then the ladder whose feet "fit the holes," then digging up the fragment, and finally the cleaned fragment matching the Kitchen china. It felt like real deduction.
  - **Interrogation had real tension.** Dunbar's denial, pointing at George, sent me straight off to question him.
  - **The amount of text was hard for me.** Every response looks the same, so the line that solves the method looks just like "The desk drawers contain no further evidence." It was hard to tell what mattered or decide what to do next.

- **Ending:** I didn't reach a real ending; the run stopped at the call limit with nine pieces of evidence found. Afterwards I opened TRUTH. It explained Baxter and Dunbar, but some things I really wanted to know weren't there:
  - Why Robner disinherited George, and whether the will was meant to mislead me. My whole theory was built on it.
  - Why Dunbar would poison her boss of ten years, and whether she knew it would kill him. For a while I believed she might be innocent: she meant to take it herself and Baxter swapped the cups.
  - How Baxter knew that LoBlo and Ebullion together would be deadly.

- **Question for the designer:**
  - Is the 100-submission cap meant to apply to human players? If so, maybe show it next to the action count; if not, it seems to come from the browser using the engine's default limits.
  
  - **Click to fill in names.** It would help if the names in the right panel (rooms, suspects, evidence) were clickable and dropped the exact spelling into the command box, so you never have to guess the capitalization. Making the casing rules consistent would help too. Going one step further, the key words could be marked right inside the paragraphs where they first appear, for example in a coloured or themed style (a blood-red smear for the fragment, a powdery look for the medicines). Clicking one would drop it into the command box. That would make the text easier to scan and remove most of the typing problems. I realise it also tells the player which words matter, so you might only mark things once they've been noticed, or leave some to discover.
  
  - **Suggest only what I've already found.** In *Detroit: Become Human*, options you haven't discovered yet are greyed out, which made that game easy for me to get into. I know that would take away the "figure out what to ask" part of your game. A middle ground could be suggestions while typing, limited to evidence and names I've already found. That wouldn't give anything away (rough sketch below).
  
    ![Sketch: clickable names and suggestions limited to discovered evidence](assets/robner-ui-sketch.svg)
  
  - **A hint button for when you're stuck.** It could work from the current case state, or even use an LLM.
  
  - **Make big moments stand out.** For example, a small shake or highlight on breakthrough lines like the LoBlo match, or a focus on the fragment when you dig it up. Different fonts could help too: a pharmacy-label style for the medicine bottles and handwriting for the letter.
  
  - **One more line in TRUTH** about the will, Dunbar's reasons and who knew about the drug interaction.
