package com.driver

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority

class DriverLocationService : Service() {

    companion object {
        const val TAG = "DriverLocationService"
        const val CHANNEL_ID = "driver_location_channel"
        const val NOTIFICATION_ID = 50110
        const val ACTION_START = "com.driver.ACTION_START_LOCATION_SERVICE"
        const val ACTION_STOP = "com.driver.ACTION_STOP_LOCATION_SERVICE"
        const val EVENT_LOCATION_UPDATE = "onDriverLocationUpdate"

        var isRunning = false
            private set

        var reactContext: ReactContext? = null

        fun sendEvent(eventName: String, params: Any?) {
            try {
                reactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit(eventName, params)
            } catch (e: Exception) {
                Log.e(TAG, "Error sending event to React Native: ${e.message}")
            }
        }
    }

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private var locationCallback: LocationCallback? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: ACTION_START

        if (action == ACTION_STOP) {
            stopLocationService()
            return START_NOT_STICKY
        }

        if (!isRunning) {
            startForegroundServiceNotification()
            startLocationUpdates()
            isRunning = true
            Log.d(TAG, "Driver Location Foreground Service started successfully.")
        }

        return START_STICKY
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Driver Duty Active",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps location tracking active while on duty"
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun startForegroundServiceNotification() {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        )

        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("City Ride Driver — Online")
            .setContentText("You are on duty. Tracking live location for rides.")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun startLocationUpdates() {
        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 3000L).apply {
            setMinUpdateIntervalMillis(2000L)
            setMinUpdateDistanceMeters(2.0f)
            setWaitForAccurateLocation(false)
        }.build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                for (location in locationResult.locations) {
                    emitLocation(location)
                }
            }
        }

        try {
            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback as LocationCallback,
                Looper.getMainLooper()
            )
        } catch (unlikely: SecurityException) {
            Log.e(TAG, "Lost location permission. Could not request updates: ${unlikely.message}")
        }
    }

    private fun emitLocation(location: Location) {
        val map = Arguments.createMap().apply {
            putDouble("latitude", location.latitude)
            putDouble("longitude", location.longitude)
            putDouble("accuracy", location.accuracy.toDouble())
            putDouble("speed", if (location.hasSpeed()) location.speed.toDouble() else 0.0)
            putDouble("heading", if (location.hasBearing()) location.bearing.toDouble() else 0.0)
            putDouble("timestamp", location.time.toDouble())
        }
        sendEvent(EVENT_LOCATION_UPDATE, map)
    }

    private fun stopLocationService() {
        try {
            locationCallback?.let {
                fusedLocationClient.removeLocationUpdates(it)
                locationCallback = null
            }
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            isRunning = false
            Log.d(TAG, "Driver Location Foreground Service stopped.")
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping location service: ${e.message}")
        }
    }

    override fun onDestroy() {
        stopLocationService()
        super.onDestroy()
    }
}
