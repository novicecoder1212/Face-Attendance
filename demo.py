import cv2

img = cv2.imread("TrainingImage/Soumik Saha/soumik saha.26.1.jpg")  # any image path
cv2.imshow("Test Window", img)
cv2.waitKey(0)
cv2.destroyAllWindows()
