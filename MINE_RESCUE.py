import cv2
from ultralytics import YOLO

# 1. Load your custom trained model
model = YOLO('best.pt')

# 2. Open webcam (use 0 for default Mac camera, or replace with 'mine_video.mp4')
cap = cv2.VideoCapture(0)

while cap.isOpened():
    success, frame = cap.read()
    if not success:
        break

    # 3. Run YOLO inference on the current frame (conf=0.4 filters out weak false positives)
    results = model.predict(frame, conf=0.4)

    # 4. Visualize the results on the frame
    annotated_frame = results[0].plot()

    # 5. Display the output window
    cv2.imshow("Mine Rescue - Live Detection", annotated_frame)

    # Press 'q' on the keyboard to exit
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
