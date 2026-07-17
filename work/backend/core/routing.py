from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'^api/messages/ws/(?P<group_id>\w+)/(?P<user_id>\w+)/?$', consumers.ChatConsumer.as_asgi()),
]