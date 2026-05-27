'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { pusherClient, pusherEnabled } from '@/lib/pusher-client'
import { sendMessage, getMessages } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader2, Minimize2, Maximize2, X, MessageSquare, Phone } from 'lucide-react'

interface FloatingChatWindowProps {
  currentUserId: string
  otherUserId: string
  otherUserName: string
  onClose: () => void
}

type Msg = {
  id: string
  senderId: string
  receiverId: string
  content: string
  createdAt: string | Date
  status?: string
}

export default function FloatingChatWindow({
  currentUserId,
  otherUserId,
  otherUserName,
  onClose,
}: FloatingChatWindowProps) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
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
      try {
        const data = await getMessages(otherUserId)
        if (!cancelled) {
          setMsgs(data as Msg[])
          setIsLoading(false)
        }
      } catch (err) {
        console.error('Failed to load messages:', err)
        if (!cancelled) setIsLoading(false)
      }
    }
    fetchMsgs()

    // Polling fallback: fetch new messages every 3 seconds to guarantee real-time updates
    const pollInterval = setInterval(async () => {
      if (cancelled) return
      try {
        const data = await getMessages(otherUserId)
        if (!cancelled && data) {
          setMsgs((prev) => {
            const newMsgs = data as Msg[]
            if (prev.length === newMsgs.length && prev[prev.length - 1]?.id === newMsgs[newMsgs.length - 1]?.id) {
              return prev
            }
            return newMsgs
          })
        }
      } catch (err) {
        console.error('Message polling failed:', err)
      }
    }, 3000)

    if (!pusherEnabled) {
      return () => {
        cancelled = true
        clearInterval(pollInterval)
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
      clearInterval(pollInterval)
      channel.unbind('new-message', onNewMessage)
      pusherClient.unsubscribe(channelName)
    }
  }, [currentUserId, otherUserId, appendMessage])

  useEffect(() => {
    if (!isMinimized) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [msgs, isMinimized])

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
      const result = await sendMessage(otherUserId, content)
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

  if (isMinimized) {
    return (
      <div className="w-72 bg-slate-900 text-white rounded-t-2xl shadow-2xl border border-slate-800 flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-800 transition-colors"
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D48BA1] to-[#e6a8bc] flex items-center justify-center text-white font-bold text-xs shadow">
            {initials}
          </div>
          <span className="font-bold text-sm truncate">{otherUserName}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={() => setIsMinimized(false)} className="p-1 hover:bg-white/10 rounded">
            <Maximize2 className="w-3.5 h-3.5 text-slate-300" />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <X className="w-3.5 h-3.5 text-slate-300" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 h-96 bg-white rounded-t-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D48BA1] to-[#e6a8bc] flex items-center justify-center text-white font-bold text-xs shadow-md">
              {initials}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 border border-slate-900 rounded-full" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-sm truncate leading-tight">{otherUserName}</span>
            <span className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">Patient</span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setIsMinimized(true)} className="p-1 hover:bg-white/10 rounded transition-colors">
            <Minimize2 className="w-3.5 h-3.5 text-slate-300" />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors">
            <X className="w-3.5 h-3.5 text-slate-300" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#F6F4F3]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-[#D48BA1]" />
          </div>
        ) : msgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <MessageSquare className="w-6 h-6 text-[#D48BA1] mb-2 opacity-60" />
            <p className="text-xs font-bold text-slate-700">Send a message</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Start the clinical consultation.</p>
          </div>
        ) : (
          msgs.map((msg) => {
            const isMine = msg.senderId === currentUserId
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed shadow-sm ${
                    isMine
                      ? 'bg-slate-950 text-white rounded-br-none'
                      : 'bg-white text-slate-800 rounded-bl-none border border-slate-100'
                  }`}
                >
                  <p>{msg.content}</p>
                  <span className="text-[8px] text-slate-400 block text-right mt-1 font-medium">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Footer */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-100 flex items-center gap-2 bg-white flex-shrink-0">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 h-9 rounded-xl bg-[#F6F4F3] border-slate-200 text-xs placeholder:text-slate-400 focus-visible:ring-[#D48BA1]"
          disabled={isSending}
          autoComplete="off"
        />
        <Button
          type="submit"
          size="icon"
          className={`w-9 h-9 rounded-xl flex-shrink-0 transition-all ${
            text.trim() ? 'bg-slate-950 hover:bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
          disabled={isSending || !text.trim()}
        >
          {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </Button>
      </form>
    </div>
  )
}
