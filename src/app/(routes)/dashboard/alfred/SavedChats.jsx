import React, { useEffect, useState, useRef } from "react";
import { db } from "../../../../../utils/dbConfig";
import { chats } from "../../../../../utils/schema";
import { asc, eq } from "drizzle-orm";
import { useClerk } from "@/context/auth-context";
import { Triangle } from "react-loader-spinner";
import { Bookmark, Sparkle, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { v4 as uuidv4 } from "uuid";
import chat from "./chatConfig";
import { useGlobalContext } from "@/context/context";

const SavedChats = () => {
  const [loading, setLoading] = useState(false);
  const [deleteLoadingMessageId, setDeleteLoadingMessageId] = useState(null);
  const [loadingMessageId, setLoadingMessageId] = useState(null);
  const [prompt, setPrompt] = useState("");
  const chatContainerRef = useRef(null);
  const [data, setData] = useState([]);
  const { user } = useClerk();

  const {
    budgetList,
    incomeList,
    expenseList,
    getAllExpenses,
    getBudgetList,
    getIncomeList,
  } = useGlobalContext();

  useEffect(() => {
    getBudgetList();
    getAllExpenses();
    getIncomeList();
  }, []);

  const getData = async () => {
    if (!user?.primaryEmailAddress?.emailAddress) return;
    setLoading(true);
    try {
      const result = await db
        .select()
        .from(chats)
        .where(eq(chats.createdBy, user.primaryEmailAddress.emailAddress))
        .orderBy(asc(chats.createdAt));
      setData(result.map((msg) => ({ ...msg, isSaved: true })));
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const onSent = () => {
    const newMessage = {
      id: uuidv4(),
      question: prompt,
      answer: "",
      isSaved: false,
    };
    setData([...data, newMessage]);
    setPrompt("");
    return newMessage.id;
  };

  const useChat = async () => {
    const messageId = onSent();
    setLoadingMessageId(messageId);
    try {
      const resp = await chat(budgetList, incomeList, expenseList, prompt);
      setData((prevData) =>
        prevData.map((message) =>
          message.id === messageId ? { ...message, answer: resp } : message
        )
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMessageId(null);
    }
  };

  const saveChat = async (id) => {
    const chatMessage = data.find((message) => message.id === id);
    if (!user?.primaryEmailAddress?.emailAddress) return;
    setDeleteLoadingMessageId(id);
    try {
      await db.insert(chats).values({
        id: chatMessage.id,
        question: chatMessage.question,
        answer: chatMessage.answer,
        createdBy: user.primaryEmailAddress.emailAddress,
        createdAt: new Date(),
      });
      toast.success("Chat saved!");
      setData((prevData) =>
        prevData.map((msg) => (msg.id === id ? { ...msg, isSaved: true } : msg))
      );
    } catch (error) {
      toast.error("Error saving chat!");
    } finally {
      setDeleteLoadingMessageId(null);
    }
  };

  const handleDelete = async (id) => {
    setDeleteLoadingMessageId(id);
    try {
      await db.delete(chats).where(eq(chats.id, id));
      setData((prev) => prev.filter((chat) => chat.id !== id));
      toast.success("Chat Deleted!");
    } catch (error) {
      toast.error("Error Deleting Chat!");
    } finally {
      setDeleteLoadingMessageId(null);
    }
  };

  useEffect(() => {
    getData();
  }, [user]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [data]);

  return (
    <div className="w-full p-2 pt-0 md:pt-0 md:py-6 md:px-10 h-full flex flex-col items-center overflow-hidden">
      {loading ? (
        <div className="h-full w-full flex justify-center items-center">
          <Triangle
            height="80"
            width="80"
            color="#4845d2"
            ariaLabel="triangle-loading"
          />
        </div>
      ) : (
        <>
          <section
            ref={chatContainerRef}
            className="h-[90%] w-full md:w-[80%] overflow-y-auto flex flex-col p-4 mx-auto"
          >
            {data?.length === 0 ? (
              <div className="text-2xl min-w-[280px] md:min-w-[350px] h-full flex flex-col items-center justify-center gap-2 font-semibold">
                <img
                  src="/Empty.svg"
                  alt=""
                  className="w-full h-1/2 object-contain object-center"
                />
                <h1>You have no Saved Chats</h1>
              </div>
            ) : (
              data?.map((message) => (
                <div key={message.id} className="mb-4 text-xl">
                  <div className="flex justify-end items-start w-full gap-2 mb-4">
                    <div className="bg-primary/90 text-white rounded-lg py-2 px-4 max-w-[70%]">
                      {message.question}
                    </div>
                    <img
                      alt=""
                      src={user?.imageUrl}
                      className="w-8 h-8 rounded-full object-contain"
                    />
                  </div>
                  <div className="flex justify-start gap-2">
                    <Sparkle
                      className={`text-primary w-6 h-6 ${
                        loadingMessageId === message.id ? "rotate" : ""
                      }`}
                    />
                    {loadingMessageId === message.id ? (
                      <div className="space-y-3 w-[200px] md:w-[500px] lg:w-[700px]">
                        <Skeleton className="h-8 w-[90%]" />
                        <Skeleton className="h-8 w-[60%]" />
                      </div>
                    ) : (
                      <div className="bg-gray-200 rounded-lg py-2 px-4 max-w-[70%]">
                        <ReactMarkdown>{message.answer}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                  <div className="flex mt-1">
                    {deleteLoadingMessageId === message.id ? (
                      <Triangle height={24} width={24} color="#4845d2" />
                    ) : message.isSaved ? (
                      <Bookmark
                        onClick={() => handleDelete(message.id)}
                        fill="#4845d2"
                        color="#4845d2"
                      />
                    ) : (
                      <Bookmark onClick={() => saveChat(message.id)} />
                    )}
                  </div>
                </div>
              ))
            )}
          </section>
          <section className="h-[10%] w-full md:w-[80%] mt-2 md:mt-4">
            <div className="flex justify-between items-center gap-6 py-2 md:py-4 px-6 bg-[#f0f4f9] w-full text-[1.2rem] sm:text-[1.5rem] rounded-xl shadow-md">
              <textarea
                className="bg-transparent h-[2.2rem] sm:h-11 w-full outline-none overflow-y-scroll resize-none"
                placeholder="Enter a prompt here"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (prompt.trim() !== "") {
                      useChat();
                    }
                  }
                }}
              />
              <button disabled={prompt === ""} onClick={useChat}>
                <Send className="text-primary" />
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default SavedChats;
