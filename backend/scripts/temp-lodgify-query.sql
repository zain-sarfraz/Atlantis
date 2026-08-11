SELECT id, bookingRef, firstName, lastName, email, checkIn, checkOut, status, currency, totalAmount, specialRequests, lodgifyBookingId, lodgifySource, createdAt
FROM Booking
WHERE firstName LIKE '%Zain%' OR lastName LIKE '%Sarfraz%' OR email LIKE '%zain%' OR specialRequests LIKE '%Zain%'
ORDER BY createdAt DESC
LIMIT 50;
SELECT id, bookingRef, firstName, lastName, email, checkIn, checkOut, status, currency, totalAmount, specialRequests, lodgifyBookingId, lodgifySource, createdAt
FROM Booking
WHERE totalAmount = 0
ORDER BY createdAt DESC
LIMIT 20;
SELECT id, name, slug, lodgifyPropertyId, lodgifyRoomTypeId
FROM RoomType
WHERE lodgifyPropertyId IN (598128, 714507)
ORDER BY lodgifyPropertyId, lodgifyRoomTypeId;
