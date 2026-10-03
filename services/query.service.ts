import { conversationRepository } from "@/repositories/conversation.repository"

import { documentRepository } from "@/repositories/document.repository"

import { messageRepository } from "@/repositories/message.repository"

import { aiService } from "@/services/ai.service"

import type { PactMindQueryResponse, QueryMode } from "@/lib/pactmind"

import { buildConversationHistory } from "@/lib/conversation-history"

import { sanitizeSourcesForStorage } from "@/lib/message-metadata"

import { isDocumentQueryAllowed } from "@/lib/query-scope"

import { ACCESS_RESTRICTED_MESSAGE } from "@/lib/access-control"

import { accessControlService } from "@/services/access-control.service"



export const queryService = {

  ask: async (

    userId: string,

    documentId: string,

    question: string,

    mode: QueryMode = "conversational",

    ipAddress?: string

  ): Promise<PactMindQueryResponse> => {

    const document = await documentRepository.findById(documentId)

    if (!document || document.userId !== userId) {

      throw new Error("Forbidden")

    }



    const docGate = isDocumentQueryAllowed(document)

    if (!docGate.allowed) {

      return {

        answer: docGate.reason ?? "Chat disabled for this document.",

        sources: [],

        confidence: "low",

      }

    }



    const existing = await conversationRepository.findByUserAndDocument(

      userId,

      documentId

    )

    const history = buildConversationHistory(existing?.messages ?? [])



    const conversation = await conversationRepository.getOrCreate(

      userId,

      documentId

    )



    const result = await aiService.queryDocument({

      document_id: documentId,

      question,

      user_id: userId,

      mode,

      history,

    })



    const irrelevant = result.irrelevant === true

    const outcome = await accessControlService.trackQueryOutcome(

      userId,

      irrelevant,

      { documentId, question, ipAddress }

    )



    let answer = result.answer

    if (outcome.restricted) {

      answer = ACCESS_RESTRICTED_MESSAGE

    }



    const response: PactMindQueryResponse = {

      ...result,

      answer,

      irrelevant,

      strike_warning: outcome.strikeWarning,

      access_restricted: outcome.restricted,

    }



    await messageRepository.createPair({

      conversationId: conversation.id,

      userContent: question,

      assistantContent: answer,

      assistantMetadata: {

        sources: sanitizeSourcesForStorage(result.sources),

        confidence: result.confidence,

        ...(irrelevant || outcome.restricted ? { irrelevant: true } : {}),

      },

    })



    return response

  },

}

