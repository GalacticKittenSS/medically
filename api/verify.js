import { decision_prompt, text_prompt } from './prompts.js';

export async function Verify(data) {
    if (data.skipverify) {
        return { decision: true, response: null };
    }

    const requiredFields = {
        referral: ["area", "clinicalDetails"],
        booking: ["reason"],
        consultation: [
            "presentingComplaint",
            "history",
            "examination",
            "assessment",
            "plan",
            "additionalNotes",
        ],
    };
    const invalidFields = [];

    for (const [section, fields] of Object.entries(requiredFields)) {
        const values = data?.[section];
        if (!values || typeof values !== "object" || Array.isArray(values)) {
            invalidFields.push(section);
            continue;
        }

        for (const field of fields) {
            if (typeof values[field] !== "string") {
                invalidFields.push(`${section}.${field}`);
            }
        }
    }

    if (invalidFields.length) {
        return {
            decision: false,
            response: `Missing or invalid required fields: ${invalidFields.join(", ")}`,
        };
    }

    const context = `Note: In the following may be abbreviated: F2F = face to face , FOOSH = fall on outstretched hand, ROM = range of movement, hx = history, 4/7 = 4 day history, BT = bony tenderness, LROM = limited range of movement, 3/12 = 3 month history, SOBOE = shortness of breath on exercise. I am a healthcare professional about to submit a referral. The patient when booking the appointment typed: '${data.booking.reason}'. I wrote: '${JSON.stringify(data.consultation)}' during the appointment and have now written '${JSON.stringify(data.referral)}' for the referral.`;
    const decision = await decision_prompt(context, "Is this suitable?", "The key information typed by the GP and the patient during the appointment are the same as the referral details", "The key information differs between the GP and patient appointment details and the referral details.");
    const response = (!decision) ? await text_prompt(context + ". Extract the medical information regarding the health and condition of the patient from my referal notes as well as the appointment information, identifying and reporting any inconsistencies. Keep to a short paragraph and use plain text only") : null;
    return { decision: decision, response: response };
}
