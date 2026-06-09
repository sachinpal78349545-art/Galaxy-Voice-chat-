import { useState } from "react";

interface UserProfile {
  name?: string;
  roomsCreated?: any[];
  followingList?: any[];
  followersList?: any[];
  posts?: any[];
}

interface TasksPanelProps {
  user: UserProfile;
}

export default function TasksPanel({ user }: TasksPanelProps) {
  const [showDailyRewards, setShowDailyRewards] = useState(false);
  const [isSignedUp, setIsSignedUp] = useState(false);

  // Safe Fallbacks to prevent crash errors
  const roomsCreated = user?.roomsCreated || [];
  const followingList = user?.followingList || [];
  const followersList = user?.followersList || [];

  // Static tasks data matching your layout setup
  const dailyTasks = [
    { id: 1, title: "Play five rounds of Ludo", progress: "0/5", reward: "x5", type: "diamond" },
    { id: 2, title: "Take the mic for 15 mins", progress: "0/15", reward: "x10", type: "diamond" },
    { id: 3, title: "Received 3 diamond gifts", progress: "0/3", reward: "x1", type: "rose" },
    { id: 4, title: "Play 5 rounds of Truth or Dare", progress: "0/5", reward: "x5", type: "diamond" },
    { id: 5, title: "Like a post in moments", progress: "0/1", reward: "x1", type: "rose" },
  ];

  return (
    <div style={{ 
      backgroundColor: "#0d0926", 
      color: "#fff", 
      padding: "32px 16px 80px 16px", // Added extra 32px top padding to push content away from header/back button
      fontFamily: "sans-serif",
      minHeight: "100vh",
      boxSizing: "border-box"
    }}>
      
      {/* Premium Daily Rewards Header Card */}
      <div style={{
        background: "linear-gradient(135deg, #2e1a47 0%, #1c143c 100%)",
        borderRadius: "20px",
        padding: "20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        border: "1px solid rgba(162, 155, 254, 0.15)",
        marginBottom: "28px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)"
      }}>
        <div>
          <h2 style={{ margin: "0 0 6px 0", fontSize: "20px", fontWeight: "bold", color: "#fff" }}>Daily Rewards</h2>
          <p style={{ margin: 0, fontSize: "13px", color: "rgba(162, 155, 254, 0.7)" }}>Sign in for 7 days to get a surprise</p>
        </div>
        <button 
          onClick={() => setShowDailyRewards(true)}
          style={{
            background: "linear-gradient(90deg, #f1c40f 0%, #f39c12 100%)",
            color: "#000",
            border: "none",
            borderRadius: "20px",
            padding: "10px 24px",
            fontWeight: "bold",
            fontSize: "14px",
            cursor: "pointer",
            boxShadow: "0 0 12px rgba(241, 196, 15, 0.4)"
          }}
        >
          Sign in
        </button>
      </div>

      {/* Title Section */}
      <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px", color: "#fff", letterSpacing: "0.02em" }}>Daily tasks</h3>

      {/* Tasks Render List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {dailyTasks.map((task) => (
          <div key={task.id} style={{
            backgroundColor: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
            borderRadius: "20px",
            padding: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              {/* Dynamic Task Emote Container */}
              <div style={{
                width: "48px",
                height: "48px",
                backgroundColor: "rgba(108, 92, 231, 0.15)",
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px"
              }}>
                {task.type === "diamond" ? "🎲" : "🌹"}
              </div>
              
              {/* Meta details text */}
              <div>
                <h4 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: "600", color: "#fff" }}>{task.title}</h4>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.3)" }}>({task.progress})</span>
                  <span style={{ fontSize: "13px", color: task.type === "diamond" ? "#60a5fa" : "#f43f5e", display: "flex", alignItems: "center", gap: "2px" }}>
                    {task.type === "diamond" ? "💎" : "🌹"} {task.reward}
                  </span>
                </div>
              </div>
            </div>

            {/* Premium CTA Button */}
            <button style={{
              backgroundColor: "#6c5ce7",
              color: "#fff",
              border: "none",
              borderRadius: "18px",
              padding: "8px 20px",
              fontSize: "13px",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "transform 0.2s"
            }}>
              Go
            </button>
          </div>
        ))}
      </div>

      {/* 7 Days Daily Rewards Modal Layer */}
      {showDailyRewards && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000000,
          padding: "20px"
        }}>
          <div style={{
            background: "linear-gradient(180deg, #322361 0%, #150f2e 100%)",
            width: "100%",
            maxWidth: "380px",
            borderRadius: "28px",
            padding: "24px",
            position: "relative",
            border: "1px solid rgba(162, 155, 254, 0.2)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.6)"
          }}>
            {/* Close Overlay Icon */}
            <button 
              onClick={() => setShowDailyRewards(false)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "rgba(255,255,255,0.1)",
                border: "none",
                color: "#fff",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                cursor: "pointer",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              ✕
            </button>

            <h3 style={{ textTransform: "none", textAlign: "center", color: "#f1c40f", fontSize: "24px", fontWeight: "900", margin: "10px 0 4px 0" }}>
              Daily Rewards
            </h3>
            <p style={{ textAlign: "center", color: "rgba(255,255,255,0.6)", fontSize: "13px", margin: "0 0 20px 0" }}>
              Sign in for 7 days to get a surprise
            </p>

            {/* Streak Grid Track list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "320px", overflowY: "auto", paddingRight: "4px" }}>
              {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                const isCompleted = day < 5;
                return (
                  <div key={day} style={{
                    backgroundColor: isCompleted ? "rgba(255,255,255,0.05)" : "rgba(108, 92, 231, 0.1)",
                    border: isCompleted ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(108, 92, 231, 0.2)",
                    borderRadius: "16px",
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ color: isCompleted ? "#2ecc71" : "#a29bfe", fontWeight: "bold" }}>
                        {isCompleted ? "✓" : "◦"}
                      </span>
                      <span style={{ fontWeight: "bold", fontSize: "14px", color: isCompleted ? "rgba(255,255,255,0.5)" : "#fff" }}>
                        Day {day}
                      </span>
                    </div>
                    <span>🎁</span>
                  </div>
                );
              })}
            </div>

            {/* Bottom Claim Action Button */}
            <button 
              onClick={() => {
                setIsSignedUp(true);
                setShowDailyRewards(false);
              }}
              style={{
                width: "100%",
                background: "linear-gradient(90deg, #e2e2e2 0%, #b5b5b5 100%)",
                color: "#111",
                border: "none",
                borderRadius: "24px",
                padding: "14px",
                fontWeight: "bold",
                fontSize: "15px",
                marginTop: "20px",
                cursor: "pointer"
              }}
            >
              {isSignedUp ? "Signed in today" : "Claim Day 5 Reward"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
