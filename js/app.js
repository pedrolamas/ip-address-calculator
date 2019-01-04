var app = angular.module('MainApp', []);

app.controller('MainController', ($scope) => {
  var ipNumberToDecimals = (ip) => {
    return [
      (ip >>> 24) & 255,
      (ip >>> 16) & 255,
      (ip >>> 8 ) & 255,
      (ip & 255)
    ];
  }

  var ipDecimalsToNumber = (ipDecimals) => {
    return (ipDecimals[0] << 24) | (ipDecimals[1] << 16) | (ipDecimals[2] << 8) | ipDecimals[3];
  }

  var ipDecimalToMetaDecimal = (ipDecimal) => {
    var binary = ipDecimal.toString(2).padStart(8, "0");

    return {
      description: ipDecimal.toString().padEnd(3, "\xA0") + " (" + binary + ")",
      decimal: ipDecimal,
      binary: binary
    };
  }

  var allMetaDecimal = Array.from({ length: 256 }, (_, i) => ipDecimalToMetaDecimal(i));

  var allMasks = Array.from({ length: 32}, (_, i) => {
    var bits = i + 1;
    var maskNumber = ~(Math.pow(2, 32 - bits) - 1);

    var mask = ipNumberToDecimals(maskNumber);
    var maxSubnets = Math.pow(2, 32 - bits);
    var maxAddresses = maxSubnets > 2 ? maxSubnets - 2 : maxSubnets;
    
    return {
      description: bits + " (" + mask.join(".") + ", max subnets: " + maxSubnets + ", max addresses: " + maxAddresses + ")",
      bits: bits,
      maskNumber: maskNumber,
      maxSubnets: maxSubnets,
      maxAddresses: maxAddresses,
      mask: mask.map(ipDecimalToMetaDecimal)
    };
  });

  $scope.availableClasses = [
    {
      description: "(classless)",
      ranges: [ allMetaDecimal, allMetaDecimal, allMetaDecimal, allMetaDecimal ],
      availableMasks: allMasks
    },
    {
      description: "A (0.0.0.0 - 127.0.0.0)",
      ranges: [ allMetaDecimal.slice(0, 127), allMetaDecimal, allMetaDecimal, allMetaDecimal ],
      availableMasks: allMasks
    },
    {
      description: "B (128.0.0.0 - 191.255.0.0)",
      ranges: [ allMetaDecimal.slice(128, 192), allMetaDecimal, allMetaDecimal, allMetaDecimal ],
      availableMasks: allMasks
    },
    {
      description: "C (192.0.0.0 - 223.255.255.0)",
      ranges: [ allMetaDecimal.slice(192, 224), allMetaDecimal, allMetaDecimal, allMetaDecimal ],
      availableMasks: allMasks
    },
    {
      description: "D (224.0.0.0 - 239.255.255.255)",
      ranges: [ allMetaDecimal.slice(224, 240), allMetaDecimal, allMetaDecimal, allMetaDecimal ],
      availableMasks: allMasks
    },
    {
      description: "E (240.0.0.0 - 255.255.255.255)",
      ranges: [ allMetaDecimal.slice(240, 256), allMetaDecimal, allMetaDecimal, allMetaDecimal ],
      availableMasks: allMasks
    },
    {
      description: "A (RFC1918, 10.0.0.0 - 10.255.255.255)",
      ranges: [ allMetaDecimal.slice(10, 11), allMetaDecimal, allMetaDecimal, allMetaDecimal ],
      availableMasks: allMasks.slice(7, 32),
      defaultMask: allMasks[7],
      disableClassA: true
    },
    {
      description: "B (RFC1918, 172.16.0.0 – 172.31.255.255)",
      ranges: [ allMetaDecimal.slice(172, 173), allMetaDecimal.slice(16, 32), allMetaDecimal, allMetaDecimal ],
      availableMasks: allMasks.slice(11, 32),
      defaultMask: allMasks[15],
      disableClassA: true
    },
    {
      description: "C (RFC1918, 192.168.0.0 – 192.168.255.255)",
      ranges: [ allMetaDecimal.slice(192, 193), allMetaDecimal.slice(168, 169), allMetaDecimal, allMetaDecimal ],
      availableMasks: allMasks.slice(15, 32),
      defaultMask: allMasks[23],
      disableClassA: true,
      disableClassB: true
    }
  ];

  // $scope.availableMasks = [...Array(9).keys()].map(function(x) {
  //   var value = ~(Math.pow(2, 8 - x) - 1) & 255;
    
  //   return {
  //     decimal: value,
  //     binary: value.toString(2).padStart(8, "0")
  //   };
  // });
  
  $scope.ipAddressDecimals = [];
  $scope.selectedMask = null;
  $scope.outputFormat = "0";

  $scope.selectedClass = $scope.availableClasses[0];
  
  $scope.$watch("selectedClass", () => {
    for (var i = 0; i < 4; i++) {
      $scope.ipAddressDecimals[i] = $scope.selectedClass.ranges[i][0].decimal;
    }
    
    $scope.selectedMask = $scope.selectedClass.defaultMask || $scope.selectedClass.availableMasks[0];
  });

  var updateOutputReport = () => {
    var ipAddressDecimals = $scope.ipAddressDecimals;
    var selectedMask = $scope.selectedMask;

    var ipAddressNumber = ipDecimalsToNumber(ipAddressDecimals);

    var maskNumber = selectedMask.maskNumber;
    var maskDecimals = ipNumberToDecimals(maskNumber);
    var wildcardMaskDecimals = ipNumberToDecimals(~maskNumber);

    var networkAddressDecimals = ipNumberToDecimals(ipAddressNumber & maskNumber);
    var broadcastAddressDecimals = ipNumberToDecimals(ipAddressNumber | ~maskNumber);

    var outputReport = [];
    var outputFormat = parseInt($scope.outputFormat);

    for (var i = 0; i < 3; i++) {
      if (i != outputFormat && outputFormat != 3) {
        continue;
      }

      switch (i) {
        case 0:
          var formatter = (x) => x;
          break;
        case 1:
          var formatter = (x) => x.toString(16).padStart(2, "0");
          break;
        case 2:
          var formatter = (x) => x.toString(2).padStart(8, "0");
          break;
      }

      var ipAddress = ipAddressDecimals.map(formatter).join(".");

      var mask = maskDecimals.map(formatter).join(".");
      var wildcardMask = wildcardMaskDecimals.map(formatter).join(".");

      var networkAddress = networkAddressDecimals.map(formatter).join(".");
      var broadcastAddress = broadcastAddressDecimals.map(formatter).join(".");

      outputReport.push("IP Address:         " + ipAddress + "/" + selectedMask.bits + "\n" +
                        "Network:            " + networkAddress + "/" + selectedMask.bits + "\n" +
                        "Subnet Mask:        " + mask + "\n" +
                        "Wildcard Mask:      " + wildcardMask + "\n" +
                        "Broadcast Address:  " + broadcastAddress + "\n" +
                        "Address Range:      " + networkAddress + " - " + broadcastAddress + "\n" +
                        "Maximum Subnets:    " + selectedMask.maxSubnets + "\n" +
                        "Maximum Addresses:  " + selectedMask.maxAddresses + "\n");
    }

    $scope.outputReport = outputReport.join("\n");
  }

  $scope.$watchCollection("ipAddressDecimals", updateOutputReport);

  $scope.$watch("selectedMask", updateOutputReport);

  $scope.$watch("outputFormat", updateOutputReport);
});