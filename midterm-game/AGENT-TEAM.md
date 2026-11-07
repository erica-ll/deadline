# Agent team record

## Supervisor/Planning Agent

Because this is a text-based detective game, which is heavy with story, I used a specific agent to help me stripe away the long story and most red herrings, and only keep the core crime scene, a few evidence to identify the real murderers, and a couple plausible suspects and their corresponding misleading evidence to add complexity. I let it read the original game files, extract the main story and evidence, and put them into STORY_AND_SUSPECT_EVIDENCE.md. Then, I read through the story file and decided the basic scope I want to keep, including 4 suspects and 4 rooms, a simplified navigation system, removed the timing system, and keep all suspects in the living room. I also let the agent know that I want to keep the second murder branch between two of the suspects, which will be triggered if the player only successfully identifies one of them. I then let the agent write a new organized plan file, MIDTERM_STORY_RECONSTRUCTION_PLAN.md, for me to view and further modify. I accepted the safe in the library evidence chain that the agent proposes, and decided we need further discussion on how to trigger the second murder branch, because of the change of mechanic. We dicided to treat it as a possible ending of the game. I wanted to make sure the decision feels natural for the player, preferrably through a mechanic that also appear in other places of the game. From there, I asked the agent to produce a complete dictionary of valid actions, which will the only vallid words that will trigger game state change.

The source notes and approved scope are in [`../STORY_AND_SUSPECT_EVIDENCE.md`](../STORY_AND_SUSPECT_EVIDENCE.md), [`../MIDTERM_STORY_RECONSTRUCTION_PLAN.md`](../MIDTERM_STORY_RECONSTRUCTION_PLAN.md), and [`../ACTION_DICTIONARY_AND_RULES.md`](../ACTION_DICTIONARY_AND_RULES.md).

Later, I also use this agent to go over the work of the other agents and checks if they sastified the requirement by the rubric. It acts as a supervisor that directly reports to me, where I will review the work and decide on the next steps.

## Implementation agent

The implementation agent is the one that does most work. It read the approved project instructions, story plan, action dictionary, and rubric, and created the engine, UI, baseline, API adapter, tests, workflow, and documentation in this folder. 
I spent a lot of time going back and forth with the implementation agent to fine-tune the stroy text and mechanics. For example, some text directly borrowed from the original game does not fit the new scope anymore, because a piece of evidence could be now discovered at another place due to the reduction inscope. Also, through playtesting, I've found a lot of problem in keyword detection, that the correct legal term could be hard for a player to guess. Therefore, similar terms acception mechanic is also added, e.g. you can use both "the new will" and "new will" when talking about the will.
Two implementation defects were reproduced and fixed, evidence is in [EVALUATION.md](EVALUATION.md#observed-regression).

## Independent reviewer

The independent review artifact is [review.md](review.md). There were three rounds of major reviews and refinement based on the reviews. After fixing the bugs (done by the implementation agent), I have added new feature or make changes in mechanics each time, e.g. test and settle on the number of moves limit. The current review reflects the final version of the game and reports a pass.

## Playtesting Agent

I used the OpenAI API to call GPT-6 Luna to do the playtesting. The process is visualized in the browser UI under http://127.0.0.1:5175/watch. The visualization engine is implemented by the implementation agent.

## Peer Playtesting Take

What I think worth redesigning or checking:
- Check if the the rejected commands use up the available budget, because I think it should not be by design.
- Add a clearer instruction for accusation, something like "when you feel you have enough evidence, you can accuse a suspect and close the investigation".
- I'll add captitalization acceptance for all terms, inclusing the rooms. 

What I would keep:
- I'll probably keep the generic rejection message, because they should not "lead" the player into a specific direction when they make mistakes. I want them to try out more possibilities and discover new possible directions themselves.
