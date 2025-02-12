import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  limit,
} from "firebase/firestore";

export default function ChatRoom() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("timestamp", "desc"), limit(120));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(
        snapshot.docs.map((doc) => {
          const data = doc.data();
          const date = data.timestamp?.toDate();
          const formattedDate = date ? `${date.toLocaleDateString()} ${date.toLocaleTimeString()}` : "N/A";
          return { id: doc.id, text: data.text, timestamp: formattedDate };
        })
      );
    });
    return () => unsubscribe();
  }, []);

  const sendMessage = async () => {
    if (newMessage.trim() === "") return;
    await addDoc(collection(db, "messages"), {
      text: newMessage,
      timestamp: serverTimestamp(),
    });
    setNewMessage("");
  };

  return (
    <div>
      <div>
        {messages.map((msg) => (
          <div key={msg.id}>
            <span>{msg.text}</span>
            <span style={{ marginLeft: "10px", fontSize: "0.8em", color: "gray" }}>{msg.timestamp}</span>
          </div>
        ))}
      </div>
      <input
        type="text"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="輸入訊息..."
      />
      <button onClick={sendMessage}>發送</button>
    </div>
  );
}
