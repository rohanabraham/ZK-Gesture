# ZK-Gesture
Verifying hand signals on-chain with ML and ZK

# Concept
ZK Gesture is an innovative Hackathon project that integrates Machine Learning (ML) and Zero Knowledge (ZK) proofs to create a novel authentication system on the blockchain. The core idea is to use hand gestures, specifically patterns like a Vulcan hand salute, as a unique authenticator for blockchain transactions.

# Technology Stack:
Machine Learning: The project leverages TensorFlow, a popular ML framework, running in the browser to detect and analyze hand patterns.

Blockchain: This solution requires ZK but can be deployed on blockchains that support ZK.

- Deployed on Aleo https://explorer.aleo.org/transaction/at1ty7ml5jvtpnw546eq0u25eakt6wyed30uy50u574wenm56mfespq7x05lq?tab=overview

Zero Knowledge Proofs: Utilizes ZK proofs to confirm computations that happened off-chain without revealing specific data about the transactions.

# How It Works:
Initial Scan: A user performs a hand gesture, which is captured and set as their reference pattern.

Subsequent Transactions: For future transactions, the user repeats the gesture. The system then compares this new pattern to the initial reference.

Normalization and Verification: To simplify the ZK component, the captured points are normalized and compared with the reference points to verify a match.

Advancements in ZK: The project capitalizes on recent advancements in ZK proofs, allowing the verification with ZK computation of off-chain models and making the system more efficient and robust.

# Potential Use Cases:
With more improvements to ZK, we could potentially run the whole ML model on-chain. We could also use more complex ML models than on this example.

Authentication: Similar to Face ID or Touch ID, ZK Gesture could offer a new form of biometric authentication for secure access and transactions.

Blockchain Applications: The combination of ML and ZK proofs equips the blockchain with "eyes and ears," enabling it to process and authenticate unique physical patterns.

Future Implications: This project paves the way for more complex and secure authentication methods in blockchain technology, expanding possibilities for user verification and transaction security.
