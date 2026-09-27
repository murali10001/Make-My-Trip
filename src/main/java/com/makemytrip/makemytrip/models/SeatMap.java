package com.makemytrip.makemytrip.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Document(collection = "seat_maps")
@JsonIgnoreProperties(ignoreUnknown = true)
public class SeatMap {

    @Id
    @JsonProperty("id")
    private String _id;
    private String flightId;
    private String aircraftType = "Airbus A320";
    private int totalRows = 12;
    private List<SeatItem> seats = new ArrayList<>();

    public SeatMap() {}

    public String getId() {
        return _id;
    }

    public void setId(String id) {
        this._id = id;
    }

    public String getFlightId() {
        return flightId;
    }

    public void setFlightId(String flightId) {
        this.flightId = flightId;
    }

    public String getAircraftType() {
        return aircraftType;
    }

    public void setAircraftType(String aircraftType) {
        this.aircraftType = aircraftType;
    }

    public int getTotalRows() {
        return totalRows;
    }

    public void setTotalRows(int totalRows) {
        this.totalRows = totalRows;
    }

    public List<SeatItem> getSeats() {
        return seats;
    }

    public void setSeats(List<SeatItem> seats) {
        this.seats = seats;
    }

    public static class SeatItem {
        private String seatNo; // e.g. "1A", "12F"
        private int row;
        private String column; // "A", "B", "C", "D", "E", "F"
        private String tier; // "EXTRA_LEGROOM", "PREMIUM_FRONT", "STANDARD_WINDOW", "STANDARD"
        private double priceAddon; // e.g. 750.0, 450.0, 250.0, 0.0
        private String status; // "AVAILABLE", "OCCUPIED"
        private String featureDescription;

        public SeatItem() {}

        public SeatItem(String seatNo, int row, String column, String tier, double priceAddon, String status, String featureDescription) {
            this.seatNo = seatNo;
            this.row = row;
            this.column = column;
            this.tier = tier;
            this.priceAddon = priceAddon;
            this.status = status;
            this.featureDescription = featureDescription;
        }

        public String getSeatNo() {
            return seatNo;
        }

        public void setSeatNo(String seatNo) {
            this.seatNo = seatNo;
        }

        public int getRow() {
            return row;
        }

        public void setRow(int row) {
            this.row = row;
        }

        public String getColumn() {
            return column;
        }

        public void setColumn(String column) {
            this.column = column;
        }

        public String getTier() {
            return tier;
        }

        public void setTier(String tier) {
            this.tier = tier;
        }

        public double getPriceAddon() {
            return priceAddon;
        }

        public void setPriceAddon(double priceAddon) {
            this.priceAddon = priceAddon;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public String getFeatureDescription() {
            return featureDescription;
        }

        public void setFeatureDescription(String featureDescription) {
            this.featureDescription = featureDescription;
        }
    }
}
