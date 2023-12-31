# ZK-Gesture: Giving blockchain eyes
Verifying hand signals on-chain with ML and ZK

# Concept
ZK Gesture is a Hackathon project that integrates Machine Learning (ML) and Zero Knowledge (ZK) proofs. The core idea of this demo is to use hand gestures, specifically patterns like a Vulcan hand salute, as a unique factor for blockchain authentication.
![Login with a hand signal](https://github.com/rohanabraham/ZK-Gesture/blob/main/Notes/Vulcan%20Hand%20Salute%20login.png?raw=true)

# Demo
https://zk-gesture-pi.vercel.app/

Steps
- Enable camera permission (All images remain on your device)
- While making a hand pose on the camera click on "Capture Reference Image". This forms the reference image that will be used to evaluate further hand poses that are made.
- Submit a second hand pose by clicking on "Capture User Image". This will be used to compare with the reference hand signal.
- Click on "Compare" to be shown the result. All actions happen on the browser.


# Technology Stack:
Machine Learning: The project leverages TensorFlow, a popular ML framework, running in the browser to detect and analyze hand patterns. https://github.com/tensorflow/tfjs-models/tree/master/hand-pose-detection

Blockchain: This solution requires ZK and can be deployed on blockchains that support ZK. ZK-Gesture is deployed on Aleo blockchain.

Zero Knowledge Proofs: Utilizes ZK proofs to confirm computations that happened off-chain without revealing specific data about the transactions.

# Aleo Blockchain:
Contract deployed on Aleo https://explorer.aleo.org/transaction/at1ty7ml5jvtpnw546eq0u25eakt6wyed30uy50u574wenm56mfespq7x05lq?tab=overview

It uses two different on-chain methods
- set_reference_points: This method sets the hand pose that has to be followed on subsequent verify actions.
- verify: This method verifies that the input provided by the user matches the reference points that are set.

TODO: The example does not implement the on-chain check for set_reference_points or verify at the moment. This can however be done with the https://aleo.tools/develop and loading the contract aleo_contract.aleo, load a private key and should be able to perform actions with the following parameters as an example

- set_reference_keysinputs

address, aleo1fsznz7x20kh9g5d8ksznjxye44nq34jp39xc63zp7rfps9ky05gsfca90p

points, [{ x: 197i64, y: 315i64 },{ x: 248i64, y: 284i64 },{ x: 282i64,  y: 247i64 },{ x: 309i64, y: 213i64 },{ x: 339i64,  y: 194i64 },{ x: 227i64, y: 186i64 },{ x: 227i64,   y: 133i64 },{ x: 226i64,  y: 101i64 },{ x: 224i64,  y: 736i64 },{ x: 198i64, y: 186i64 },{ x: 199i64, y: 128i64 },{ x: 201i64, y: 932i64 },{ x: 203i64, y: 635i64 },{ x: 172i64,  y: 195i64 },{ x: 163i64,  y: 143i64 },{ x: 159i64, y: 112i64 },{ x: 158i64, y: 851i64 },{ x: 145i64, y: 211i64 },{ x: 139i64, y: 170i64 },{ x: 137i64,  y: 145i64 },{ x: 137i64,  y: 120i64 }]

Example: https://explorer.aleo.org/transaction/at1wr9a59cn56a3du20hnzm7ytjukpzqt896rjs0tr2xn3w2h7hsugsl0tkys

- verifyinputs

address, aleo1fsznz7x20kh9g5d8ksznjxye44nq34jp39xc63zp7rfps9ky05gsfca90p

points, [{ x: 197i64, y: 315i64 },{ x: 248i64, y: 284i64 },{ x: 282i64,  y: 247i64 },{ x: 309i64, y: 213i64 },{ x: 339i64,  y: 194i64 },{ x: 227i64, y: 186i64 },{ x: 227i64,   y: 133i64 },{ x: 226i64,  y: 101i64 },{ x: 224i64,  y: 736i64 },{ x: 198i64, y: 186i64 },{ x: 199i64, y: 128i64 },{ x: 201i64, y: 932i64 },{ x: 203i64, y: 635i64 },{ x: 172i64,  y: 195i64 },{ x: 163i64,  y: 143i64 },{ x: 159i64, y: 112i64 },{ x: 158i64, y: 851i64 },{ x: 145i64, y: 211i64 },{ x: 139i64, y: 170i64 },{ x: 137i64,  y: 145i64 },{ x: 137i64,  y: 120i64 }]

Execution Successful!

# How It Works:
Initial Scan: A user performs a hand gesture, which is captured and set as their reference pattern.

Subsequent Transactions: For future transactions, the user repeats the gesture. The system then compares this new pattern to the initial reference.

Normalization and Verification: To simplify the ZK component, the captured points are normalized and compared with the reference points to verify a match.

Advancements in ZK: The project capitalizes on recent advancements in ZK proofs, allowing the verification with ZK computation of off-chain models.

# Potential Future Use Cases:
With more improvements to ZK, we could potentially run the whole ML model on-chain. In time, we could also use more way more complex ML models than on this example like Face recognition and even potentially LLMs.

Authentication and Identity verification: Similar to Face ID or Touch ID, ZK Gesture could offer a new factor in the form of biometric authentication for secure access and transactions. Additional factors for authentication minimize the downside of losing a private key. With account abstraction, it is possible to reset a private key combining with other factors.

Financial Services: Additional verification with Voice or Face or additional biometric features along with transaction signatures to help with KYC / KYT.

Blockchain Applications: The combination of ML and ZK proofs equips the blockchain with "eyes and ears," enabling it to process and authenticate unique physical patterns.

Future Implications: This project demonstrates possibilties for more complex and secure authentication methods in blockchain technology, expanding possibilities for user verification and transaction security.
