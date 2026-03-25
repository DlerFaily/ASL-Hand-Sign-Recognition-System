from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

class TestView(viewsets.ViewSet):
    def list(self, request):
        return Response({"message": "test ok"})
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def protected(self, request):
        """
        Protected endpoint that requires JWT authentication.
        Returns the authenticated user's information.
        """
        user = request.user
        
        return Response({
            'message': 'This is a protected endpoint',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            }
        }, status=status.HTTP_200_OK)