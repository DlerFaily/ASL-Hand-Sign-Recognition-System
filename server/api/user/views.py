from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .serlializer import UserRegistrationSerializer
from django.db.models import Count, Case, When, Value, F, FloatField, Sum
import re

@api_view(['POST'])
@permission_classes([AllowAny])
def signup(request):
    """
    User registration endpoint.
    Returns JWT tokens upon successful registration.
    """
    serializer = UserRegistrationSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.save()
        
        # Generate JWT tokens for the new user
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': {
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            },
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            'message': 'User registered successfully'
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

'''i was not getting the correct results at all for this function: no matches even when there were
so i had to change the logic and using regex was the only way i found without making migrations.
From my testing now works with no issues'''
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getStats(request): 
    user = request.user
    
    # Get all predictions for the user
    predictions = user.predictions.all()
    
    # Dictionary to store stats for each letter
    stats_dict = {}
    
    for prediction in predictions:
        # Extract the letter name from the target_letter string
        # Format: "{'id': 18, 'name': 'h', 'example_image': '', 'is_active': True}"
        target_letter_str = prediction.target_letter
        
        # Use regex to extract the 'name' value
        match = re.search(r"'name':\s*'([^']+)'", target_letter_str)
        if match:
            letter = match.group(1)
        else:
            continue  # Skip if we can't parse the letter
        
        # Initialize stats for this letter if not exists
        if letter not in stats_dict:
            stats_dict[letter] = {
                'target_letter': letter,
                'total_count': 0,
                'matched_count': 0,
                'match_percentage': 0.0
            }
        
        # Increment total count
        stats_dict[letter]['total_count'] += 1
        
        # Check if prediction matches target
        # Need to extract letter from predicted_letter too if it's in same format
        predicted_letter_str = prediction.predicted_letter
        
        # Try to extract letter from predicted_letter
        predicted_match = re.search(r"'name':\s*'([^']+)'", predicted_letter_str)
        if predicted_match:
            predicted_letter = predicted_match.group(1)
        else:
            # If it's just a plain string (like "h"), use it directly
            predicted_letter = predicted_letter_str
        
        # If prediction matches target, increment matched_count
        if predicted_letter == letter:
            stats_dict[letter]['matched_count'] += 1
    
    # Calculate percentages and convert to list
    stats = []
    for letter, stat in stats_dict.items():
        if stat['total_count'] > 0:
            stat['match_percentage'] = round((stat['matched_count'] / stat['total_count']) * 100, 2)
        stats.append(stat)
    
    # Sort by letter name for consistency
    stats.sort(key=lambda x: x['target_letter'])
    
    return Response(stats, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile(request):
    """
    Protected endpoint that requires JWT authentication.
    Returns the authenticated user's profile information.
    """
    user = request.user
    
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'is_staff': user.is_staff,
        'date_joined': user.date_joined,
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getStats(request): 
    """
    Returns user statistics from their saved predictions
    """
    user = request.user
    predictions = user.predictions.annotate(
        match=Case(
            When(predicted_letter=F('target_letter'), then=Value(1)),
            default=Value(0),
            output_field=FloatField()
        )
    )
    # Group by target_letter and calculate statistics for each letter
    stats = predictions.values('target_letter').annotate(
        total_count=Count('target_letter'), 
        matched_count=Count('match', filter=Case(
            When(match=1, then=Value(1)),
            default=Value(0),
            output_field=FloatField()
        )), 
    )
    
    for stat in stats:
        if stat['total_count'] > 0:
            stat['match_percentage'] = (stat['matched_count'] / stat['total_count']) * 100
        else:
            stat['match_percentage'] = 0

    return Response(stats, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def is_staff(request): 
    """
    Returns info if user is a staff member
    """
    return Response({
        'is_staff': request.user.is_staff 
    }, status=status.HTTP_200_OK)
