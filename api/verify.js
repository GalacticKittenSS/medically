import { decision_prompt, text_prompt } from './prompts.js';

export async function Verify(data) {
    const context = "I am a healthcare professional about to submit a referral. The patient when booking the appointment typed: '" + data.patient_notes + "'. I wrote: '" + data.referral + "."
    const decision = await decision_prompt(context, "Is this suitable?", "The key information typed by the GP and the patient are the same", "The key information differs between the GP and the patient");
    const response = (!decision) ? await text_prompt(context + ". Only state a list of the differences. Keep it minimal") : null;
    return { decision: decision, response: response };
}
