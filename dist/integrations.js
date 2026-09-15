/**
 * Future integration boundary. This file deliberately makes no network requests.
 * Keep provider secrets in a server environment, never in this static app.
 */
export const integrationStatus=Object.freeze({authentication:'local-demo',database:'browser',files:'indexeddb',ai:'not-connected',whatsapp:'not-connected',email:'not-connected',payments:'manual'});
export const agentContracts=Object.freeze({
 generateQuiz:{input:['teacherId','batchId','subject','topic','questionCount','language'],output:['questions','answerKey','rationale'],reviewRequired:true},
 suggestGrade:{input:['teacherId','assignmentId','submissionId','rubric'],output:['suggestedMarks','feedback','evidence'],reviewRequired:true},
 learningInsights:{input:['teacherId','studentId','dateRange'],output:['weakTopics','evidence','practiceSuggestions'],reviewRequired:true},
 guardianReply:{input:['verifiedGuardianId','studentId','question','language'],output:['reply','recordReferences'],reviewRequired:true}
});
export class IntegrationNotConfiguredError extends Error{constructor(provider){super(provider+' is not connected. Configure a server-side adapter before use.');this.name='IntegrationNotConfiguredError';}}
export async function runAgent(){throw new IntegrationNotConfiguredError('AI');}
export async function sendGuardianMessage(){throw new IntegrationNotConfiguredError('WhatsApp');}
