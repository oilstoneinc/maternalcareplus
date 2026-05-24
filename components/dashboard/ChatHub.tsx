'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { pusherClient } from '@/lib/pusher-client'
import { sendMessage, getMessages } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader2, MessageCircle, Phone } from 'lucide-react'

interface ChatHubProps {
  currentUserId: string
  otherUserId: string
  otherUserName: string
  otherUserRole?: string
  pregnancyId?: string
  /** Hospital or contact phone for tap-to-call */
  contactPhone?: string | null
}

type Msg = {
  id: string
  senderId: string
  receiverId: string
  content: string
  createdAt: string | Date
  status?: string
}

const pusherEnabled =
  typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_PUSHER_APP_KEY &&
  process.env.NEXT_PUBLIC_PUSHER_APP_KEY !== 'dummy_key'

export default function ChatHub({
  currentUserId,
  otherUserId,
  otherUserName,
  otherUserRole,
  pregnancyId,
  contactPhone,
}: ChatHubProps) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const appendMessage = useCallback((msg: Msg) => {
    setMsgs((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev
      return [...prev, msg]
    })
  }, [])

  useEffect(() => {
    let cancelled = false

    const fetchMsgs = async () => {
      const data = await getMessages(otherUserId)
      if (!cancelled) {
        setMsgs(data as Msg[])
        setIsLoading(false)
      }
    }
    fetchMsgs()

    if (!pusherEnabled) {
      return () => {
        cancelled = true
      }
    }

    const channelName = `chat-${currentUserId}`
    const channel = pusherClient.subscribe(channelName)

    const onNewMessage = (data: Msg) => {
      if (data.senderId === otherUserId || data.senderId === currentUserId) {
        appendMessage(data)
      }
    }

    channel.bind('new-message', onNewMessage)

    return () => {
      cancelled = true
      channel.unbind('new-message', onNewMessage)
      pusherClient.unsubscribe(channelName)
    }
  }, [currentUserId, otherUserId, appendMessage])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || isSending) return
    const content = text.trim()
    setText('')
    setIsSending(true)

    const optimistic: Msg = {
      id: `temp-${Date.now()}`,
      senderId: currentUserId,
      receiverId: otherUserId,
      content,
      createdAt: new Date().toISOString(),
      status: 'sent',
    }
    appendMessage(optimistic)

    try {
      const result = await sendMessage(otherUserId, content, pregnancyId)
      if (result.success && result.message) {
        setMsgs((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== optimistic.id)
          if (withoutTemp.some((m) => m.id === result.message.id)) return withoutTemp
          return [...withoutTemp, result.message as Msg]
        })
      } else {
        setMsgs((prev) => prev.filter((m) => m.id !== optimistic.id))
        setText(content)
      }
    } catch (err) {
      console.error('Send failed:', err)
      setMsgs((prev) => prev.filter((m) => m.id !== optimistic.id))
      setText(content)
    } finally {
      setIsSending(false)
    }
  }

  const initials = otherUserName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  const roleLabel =
    otherUserRole === 'midwife'
      ? 'Midwife'
      : otherUserRole === 'hospital_staff'
        ? 'Hospital staff'
        : otherUserRole === 'pregnant_woman'
          ? 'Patient'
          : 'Care team'

  const phoneHref = contactPhone
    ? `tel:${contactPhone.replace(/[^\d+]/g, '')}`
    : null

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[500px] bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
      <div className="flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex-shrink-0">
        <div className="relative">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#D48BA1] to-[#e6a8bc] flex items-center justify-center text-white font-black text-sm shadow-lg">
            {initials}
          </div>
          {pusherEnabled && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-slate-800 rounded-full" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-white truncate">{otherUserName}</p>
          <p className="text-xs text-slate-400 font-medium">
            {roleLabel}
            {pusherEnabled ? ' · Live' : ''}
          </p>
        </div>
        {phoneHref && (
          <a
            href={phoneHref}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
            aria-label="Call"
          >
            <Phone className="w-4 h-4 text-slate-300" />
          </a>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-[#F6F4F3]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#D48BA1]" />
              <p className="text-sm text-slate-500 font-medium">Loading messages…</p>
            </div>
          </div>
        ) : msgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-sm border border-slate-100">
              <MessageCircle className="w-8 h-8 text-[#D48BA1]" />
            </div>
            <div>
              <p className="font-black text-slate-800">Start a conversation</p>
              <p className="text-sm text-slate-500 font-medium mt-1">
                Messages appear instantly for you and {otherUserName}.
              </p>
            </div>
          </div>
        ) : (
          msgs.map((msg, i) => {
            const isMine = msg.senderId === currentUserId
            const showTime =
              i === 0 ||
              new Date(msg.createdAt).getTime() - new Date(msgs[i - 1].createdAt).getTime() >
                5 * 60 * 1000

            return (
              <div key={msg.id}>
                {showTime && (
                  <div className="text-center my-3">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-white px-3 py-1 rounded-full shadow-sm">
                      {new Date(msg.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
                <div className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                  {!isMine && (
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#D48BA1] to-[#e6a8bc] flex items-center justify-center text-white font-black text-[9px] flex-shrink-0 mb-0.5">
                      {initials}
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      isMine
                        ? 'bg-slate-900 text-white rounded-br-none'
                        : 'bg-white text-slate-800 rounded-bl-none border border-slate-100'
                    }`}
                  >
                    <p>{msg.content}</p>
                    <span
                      className={`text-[9px] mt-1 block font-semibold ${isMine ? 'text-slate-400 text-right' : 'text-slate-400'}`}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex-shrink-0 px-6 py-4 bg-white border-t border-slate-100">
        <form onSubmit={handleSend} className="flex items-center gap-3">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Message ${otherUserName}…`}
            className="rounded-2xl bg-[#F6F4F3] border-slate-200 focus-visible:ring-[#D48BA1] font-medium text-slate-800 placeholder:text-slate-400 py-5 px-5"
            disabled={isSending}
            autoComplete="off"
          />
          <Button
            type="submit"
            size="icon"
            className={`w-11 h-11 rounded-2xl flex-shrink-0 shadow-md transition-all ${
              text.trim() ? 'bg-slate-900 hover:bg-slate-800 hover:scale-105' : 'bg-slate-200 cursor-not-allowed'
            }`}
            disabled={isSending || !text.trim()}
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
        <p className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-2">
          Secure clinical messaging
        </p>
      </div>
    </div>
  )
}
